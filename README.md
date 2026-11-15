# Termas Punulaf · Sistema de reserva de tinas y saunas

Reservas en línea para Termas Punulaf (Chile): 12 tinas individuales, 5 saunas y piscinas libres.
Los datos viven en el navegador con `localStorage`: no hay base de datos ni servicios externos. Lo único que corre en el servidor de la propia app es la verificación de la clave de administración.

## Cómo arrancar

```sh
npm install      # o bun install
npm run dev      # abre http://localhost:8080
npm test         # pruebas de las reglas de negocio
```

Páginas: `/` inicio · `/reservar` · `/mi-visita` · `/graficos` · `/admin`.

## Datos simulados

La primera vez que se abre la app se generan datos ficticios de prueba (`src/lib/seed.ts`):

- Reservas de los últimos ~14 meses y de las próximas 3 semanas, con cancelaciones y asistencia marcada.
- Hoy a las 12:00 las tinas quedan sobreocupadas a propósito (tinas 11 y 12 y sauna 5 en mantención) para ver la alerta roja en `/admin`.
- Reservas conocidas para probar «Mi visita»: `PUN-2026` + `9 1234 5678` (cancelable) y `PUN-HOY1` + `9 8765 4321` (hoy, no cancelable).
- El teléfono del recinto (`+56 9 4567 8901`) es ficticio.

Claves en `localStorage`: `termas-punulaf:bookings` y `termas-punulaf:settings`.

### Reiniciar los datos

- Desde `/admin` → «Clave y datos»: **Eliminar datos de ejemplo** (borra solo las reservas de prueba) o **Recargar datos de ejemplo**.
- Reinicio total: borrar esas dos claves en las herramientas del navegador (Application → Local Storage) y recargar. Vuelven precios, clave inicial y datos de ejemplo.

## Clave de administración

- La clave inicial es `termas2026` y protege `/admin` y `/graficos`.
- **Se verifica en el servidor de la propia app** (funciones de servidor de TanStack Start, sin servicios externos):
  - El navegador nunca recibe la clave ni su hash; solo envía lo que se escribe y el servidor responde si es correcta.
  - La sesión es una cookie `HttpOnly` cifrada con el secreto `ADMIN_SESSION_SECRET` (8 horas). El código de la página no puede leerla ni falsificarla.
  - Al entrar a `/admin` o `/graficos`, la ruta consulta al servidor si la sesión es válida antes de mostrar el panel.
- Se cambia desde `/admin` → «Clave y datos» → **Grabar**. El servidor guarda el hash de la nueva clave en una cookie `HttpOnly` firmada (por navegador, igual que los datos) y las sesiones anteriores dejan de valer.
- Para cambiar la clave **inicial** en el código, generar un hash nuevo y reemplazar `DEFAULT_ADMIN_PASSWORD_HASH` en `src/lib/admin-default.server.ts`:

  ```sh
  python3 -c "import hashlib,os;s=os.urandom(16);print(s.hex(), hashlib.pbkdf2_hmac('sha256',b'NUEVA_CLAVE',s,100000,32).hex())"
  ```

  El primer valor va en `salt` y el segundo en `hash` (100.000 iteraciones, el máximo que admite el servidor).
- Para volver a la clave inicial en un navegador: borrar las cookies del sitio.

## Cómo se evita que se pisen los turnos

Las reglas están en `src/lib/termas.ts` (funciones puras, con pruebas en `src/lib/termas.test.ts`):

- **Tinas:** 1 tina por persona (los menores de 4 años no cuentan y comparten la tina del adulto). Un grupo de 4 necesita 4 tinas libres en ese horario.
- **Saunas:** 1 sauna para 1 a 4 personas; 2 saunas para 5 o 6.
- Turnos cada hora en punto de 10:00 a 17:00 (tina 45 min, sauna 30 min), para terminar antes del cierre a las 18:00.
- Antes de mostrar un horario y otra vez al confirmar, `validateRequest` suma las unidades de las reservas confirmadas de ese día y hora y lo compara con el cupo disponible. Si no alcanza, el horario aparece «Sin cupo» y la reserva no se crea.
- **Día Completo:** tina y sauna deben ir en horas distintas; al elegir la tina a las 11:00 el sauna de las 11:00 queda bloqueado con el motivo.
- Las reservas canceladas no ocupan cupo.

## Cómo impacta el mantenimiento en el cupo

En `/admin` → «Grilla del día» se marcan unidades fuera de servicio para una fecha. El cupo de ese día pasa a ser `unidades totales − fuera de servicio` en todos los turnos:

- Las nuevas reservas solo ven el cupo reducido.
- Si ya había más unidades reservadas que las operativas, el turno se marca en rojo y se listan las reservas afectadas (código, nombre y celular) para contactarlas.

## Cancelaciones

- Más de 24 horas antes del primer turno (o de las 10:00 si es solo piscinas): se cancela en línea y los turnos se liberan.
- Menos de 24 horas: no se libera y se muestra el aviso de contactar al recinto.
