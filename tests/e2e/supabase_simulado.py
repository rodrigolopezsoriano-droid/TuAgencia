"""Supabase simulado (auth + PostgREST) para probar el panel sin tocar la base real.
Imita las reglas RLS de supabase/schema.sql: cada rol solo ve y escribe lo que le toca."""
import json, base64, time, itertools, re
from urllib.parse import urlparse, parse_qs

ids = itertools.count(1)
b64 = lambda d: base64.urlsafe_b64encode(json.dumps(d).encode()).decode().rstrip("=")
jwt = lambda u: f'{b64({"alg": "HS256", "typ": "JWT"})}.{b64({"sub": u["id"], "email": u["email"], "exp": int(time.time()) + 3600, "role": "authenticated", "aud": "authenticated"})}.firma'
CORS = {"access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*", "access-control-expose-headers": "*"}


class Backend:
    def __init__(s):
        s.users = {}
        s.staff = {  # email -> (rol, nombre)
            "admin@tuagencia.tech": ("admin", "Administración"),
            "pablo@tuagencia.tech": ("equipo", "Pablo Villalvilla Martín"),
            "rodrigo@tuagencia.tech": ("equipo", "Rodrigo López Soriano"),
        }
        s.t = {k: [] for k in ["clientes", "automatizaciones", "metricas", "informes", "tickets", "leads", "notas"]}
        s.last = {}
        s.log = []  # peticiones de escritura, para comprobar en los tests
        s.sin_funciones_nuevas = False  # simula base de datos sin actualizar (sin mi_rol/equipo/notas)

    # ── usuarios ──
    def add_user(s, email, password, confirmed=True, meta=None):
        meta = dict(meta or {})
        u = {"id": f"u{next(ids)}", "email": email.lower(), "password": password, "confirmed": confirmed, "meta": meta}
        s.users[u["email"]] = u
        if u["email"] not in s.staff:
            s.t["clientes"].append({"id": next(ids) + 100, "user_id": u["id"], "negocio": meta.get("negocio") or "Sin indicar", "contacto": meta.get("nombre"),
                                    "email": u["email"], "plan": None, "coste_hora": 15, "alta": "2026-09-01"})
        return u

    def user_of(s, req):
        a = req.headers.get("authorization", "")
        if not a.startswith("Bearer "):
            return None
        try:
            p = json.loads(base64.urlsafe_b64decode(a[7:].split(".")[1] + "=="))
        except Exception:
            return None
        return next((u for u in s.users.values() if u["id"] == p["sub"]), None)

    def rol(s, u):
        e = s.staff.get(u["email"]) if u and u["confirmed"] else None
        return e[0] if e else None

    def usr_json(s, u):
        return {"id": u["id"], "aud": "authenticated", "role": "authenticated", "email": u["email"], "email_confirmed_at": "2026-01-01T00:00:00Z" if u["confirmed"] else None,
                "user_metadata": u["meta"], "app_metadata": {}, "identities": [{"id": u["id"]}], "created_at": "2026-01-01T00:00:00Z"}

    def session(s, u):
        return {"access_token": jwt(u), "token_type": "bearer", "expires_in": 3600, "expires_at": int(time.time()) + 3600, "refresh_token": "r" + u["id"], "user": s.usr_json(u)}

    def perfiles(s):
        return [{"user_id": u["id"], "nombre": u["meta"].get("nombre"), "negocio": u["meta"].get("negocio"), "telefono": u["meta"].get("telefono"), "email": u["email"]} for u in s.users.values()]

    def mi_cliente(s, u):
        return next((c for c in s.t["clientes"] if c["user_id"] == u["id"]), None)

    # ── RLS ──
    def visibles(s, tabla, u, rol):
        if tabla == "perfiles":
            return s.perfiles() if rol else [p for p in s.perfiles() if p["user_id"] == u["id"]]
        filas = s.t.get(tabla, [])
        if rol:
            return filas
        mi = s.mi_cliente(u)
        if tabla == "clientes": return [c for c in filas if c["user_id"] == u["id"]]
        if tabla in ("automatizaciones", "metricas", "informes"): return [f for f in filas if mi and f["cliente_id"] == mi["id"]]
        if tabla == "tickets": return [f for f in filas if f["user_id"] == u["id"]]
        if tabla == "leads": return [f for f in filas if f.get("user_id") == u["id"]]
        return []  # notas: nunca para un cliente

    def puede_escribir(s, tabla, op, u, rol, fila=None):
        if tabla == "tickets":
            if op == "insert": return fila.get("user_id") == u["id"]
            return bool(rol) and op == "update"
        if tabla == "leads": return bool(rol) and op == "update"
        if tabla in ("automatizaciones", "metricas", "informes"): return bool(rol)
        if tabla == "notas": return bool(rol) and (op != "insert" or fila.get("autor") == u["email"])
        if tabla == "clientes": return rol == "admin"
        if tabla == "perfiles": return op == "update"
        return False

    def filtrar(s, filas, q):
        for k, vs in q.items():
            if k in ("select", "order", "limit", "offset"):
                continue
            for v in vs:
                m = re.match(r"(eq|gte|lte|neq|in)\.(.*)", v)
                if not m: continue
                op, val = m.groups()
                def col(f):
                    x = f.get(k)
                    return x
                if op == "eq": filas = [f for f in filas if str(col(f)) == val]
                elif op == "neq": filas = [f for f in filas if str(col(f)) != val]
                elif op == "gte": filas = [f for f in filas if col(f) is not None and str(col(f)) >= val]
                elif op == "lte": filas = [f for f in filas if col(f) is not None and str(col(f)) <= val]
                elif op == "in": filas = [f for f in filas if str(col(f)) in val.strip("()").split(",")]
        if "order" in q:
            c, _, d = q["order"][0].partition(".")
            filas = sorted(filas, key=lambda f: (f.get(c) is None, str(f.get(c))), reverse=(d == "desc"))
        if "limit" in q:
            filas = filas[: int(q["limit"][0])]
        return filas

    # ── manejador ──
    def handle(s, route):
        req = route.request
        url = urlparse(req.url)
        path, q = url.path, parse_qs(url.query)

        def out(body, status=200, extra=None):
            route.fulfill(status=status, headers={**CORS, "content-type": "application/json", **(extra or {})}, body=json.dumps(body) if body is not None else "")

        if req.method == "OPTIONS":
            return route.fulfill(status=204, headers=CORS)
        body = json.loads(req.post_data) if req.post_data else {}
        u = s.user_of(req)
        rol = s.rol(u)

        # auth
        if path == "/auth/v1/signup":
            email = body["email"].lower()
            if email in s.users: return out({**s.usr_json(s.users[email]), "identities": []})
            nu = s.add_user(email, body["password"], False, body.get("data", {}))
            return out({**s.usr_json(nu), "identities": [{"id": nu["id"]}]})
        if path == "/auth/v1/token":
            usr = s.users.get(body.get("email", "").lower())
            if not usr or usr["password"] != body.get("password"):
                return out({"code": 400, "error_code": "invalid_credentials", "msg": "Invalid login credentials"}, 400)
            if not usr["confirmed"]:
                return out({"code": 400, "error_code": "email_not_confirmed", "msg": "Email not confirmed"}, 400)
            return out(s.session(usr))
        if path == "/auth/v1/user":
            if not u: return out({"msg": "bad jwt"}, 401)
            if req.method == "PUT":
                u["password"] = body.get("password", u["password"]); s.log.append(("password", u["email"]))
            return out(s.usr_json(u))
        if path == "/auth/v1/logout":
            s.log.append(("logout", (req.url.split("scope=") + [""])[1]))
            return route.fulfill(status=204, headers=CORS)
        if path in ("/auth/v1/recover", "/auth/v1/resend"):
            return out({})

        # rpc
        if path.startswith("/rest/v1/rpc/"):
            fn = path.split("/")[-1]
            if fn in ("mi_rol", "equipo") and s.sin_funciones_nuevas:
                return out({"code": "PGRST202", "message": "Could not find the function"}, 404)
            if not u: return out({"message": "permission denied"}, 401)
            if fn == "es_staff": return out(rol is not None)
            if fn == "es_admin": return out(rol == "admin")
            if fn == "mi_rol":
                e = s.staff.get(u["email"]) if u["confirmed"] else None
                return out([{"rol": e[0], "nombre": e[1]}] if e else [])
            if fn == "equipo":
                return out([{"email": m, "nombre": n, "rol": r, "ultimo_acceso": ("2026-11-15T10:00:00Z" if m in s.users else None), "confirmado": m in s.users} for m, (r, n) in s.staff.items()] if rol else [])
            return out({"message": "no mock"}, 404)

        # tablas
        if not u: return out({"message": "permission denied"}, 401)
        tabla = path.split("/")[-1]
        if tabla == "notas" and s.sin_funciones_nuevas:
            return out({"code": "42P01", "message": "relation public.notas does not exist"}, 404)
        quiere_obj = "pgrst.object" in req.headers.get("accept", "")
        devuelve = "return=representation" in req.headers.get("prefer", "")

        def resp(filas, status=200):
            if quiere_obj:
                return out(filas[0] if filas else None, status if filas else 406)
            return out(filas, status)

        if req.method == "GET":
            return out(s.filtrar(s.visibles(tabla, u, rol), q))

        if req.method == "POST":
            items = body if isinstance(body, list) else [body]
            creadas = []
            for it in items:
                it = dict(it)
                if tabla == "notas": it.setdefault("autor", u["email"])
                if not s.puede_escribir(tabla, "insert", u, rol, it):
                    return out({"code": "42501", "message": "new row violates row-level security policy"}, 403)
                if tabla == "tickets": it.update(estado="abierto", respuesta=None, creado="2026-11-16T10:00:00Z", actualizado="2026-11-16T10:00:00Z"); it.setdefault("tipo", "otro")
                if tabla == "automatizaciones": it.setdefault("activa", True); it["creado"] = "2026-11-16T10:00:00Z"
                if tabla == "informes": it["creado"] = "2026-11-16T10:00:00Z"
                if tabla == "notas": it["creado"] = "2026-11-16T10:30:00Z"
                it["id"] = next(ids) + 1000
                s.t[tabla].append(it); creadas.append(it)
                s.log.append(("insert", tabla, it))
            return resp(creadas, 201) if devuelve else route.fulfill(status=201, headers=CORS)

        if req.method in ("PATCH", "DELETE"):
            if tabla == "perfiles":
                if req.method == "PATCH": u["meta"].update({k: v for k, v in body.items()}); s.log.append(("perfil", body))
                return route.fulfill(status=204, headers=CORS)
            objetivo = s.filtrar(s.visibles(tabla, u, rol), q)
            if not s.puede_escribir(tabla, "update" if req.method == "PATCH" else "delete", u, rol):
                return route.fulfill(status=204, headers=CORS) if req.method == "PATCH" else out([], 200)  # RLS: 0 filas afectadas, sin error
            for f in objetivo:
                if req.method == "PATCH": f.update(body)
                else: s.t[tabla].remove(f)
            s.log.append((req.method.lower(), tabla, body, len(objetivo)))
            return resp(objetivo) if devuelve else route.fulfill(status=204, headers=CORS)
        return out({"message": "no mock"}, 404)
