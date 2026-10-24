# Historias de Usuario

## Definición del documento

- **Para qué sirve:** desglosa las necesidades de los usuarios en unidades de valor funcionales y estimables.
- **Cuándo se crea o actualiza:** en la fase de Iniciación y durante la planificación de cada iteración (Bolt).
- **Qué debe contener:** identificador, rol, acción, beneficio, prioridad, estado y trazabilidad con requisitos.

---

## 1. Comensales y clientes

| ID | Como… | Quiero… | Para… | Prioridad | Trazabilidad |
|---|---|---|---|---|---|
| **HU-01** | comensal en la mesa | escanear el QR y ver la carta al instante en mi celular | decidir qué pedir sin esperar la carta física | Must | RF-01, RNF-01 |
| **HU-02** | comensal | navegar por categorías y ver foto, precio, alérgenos y si algo está agotado | elegir rápido y sin sorpresas | Must | RF-01, RF-05 |
| **HU-03** | cliente | ver las promociones y el menú del día arriba de todo | aprovechar las ofertas («Churrascos 2x1») | Must | RF-04 |
| **HU-04** | cliente que busca dónde comer | encontrar el local en Google, saber si está abierto y llegar o llamar con un toque | ir sin perderme ni llamar a ciegas | Must | RF-02, RF-03, RF-08 |
| **HU-05** | turista | ver la carta en inglés | entender qué es un completo, un as o una chorrillana | Must | RF-06 |
| **HU-06** | persona con lector de pantalla o baja visión | recorrer la carta con teclado y lector, con buen contraste | pedir con autonomía | Must | RNF-02 |

## 2. Dueño del local (panel)

| ID | Como dueño quiero… | Para… | Prioridad | Trazabilidad |
|---|---|---|---|---|
| **HU-07** | entrar al panel con mi contraseña de forma segura | que nadie más cambie la carta | Must | RF-09 |
| **HU-08** | cambiar precios, nombres, descripciones y fotos desde el celular y que se publique al instante | tener la carta siempre al día sin llamar a un técnico | Must | RF-10, RF-11 |
| **HU-09** | marcar un producto como agotado con un toque | no tener que explicar en cada mesa que algo se acabó | Must | RF-12 |
| **HU-10** | gestionar promociones, menú del día y fotos destacadas | destacar lo que quiero vender hoy | Must | RF-10 |
| **HU-11** | editar horario, servicios (Wi-Fi, Pet Friendly) y redes | que la información del local sea correcta | Must | RF-10 |
| **HU-12** | descargar el QR permanente y una tarjeta para las mesas | imprimirlo una sola vez | Must | RF-13 |
| **HU-13** | ver cuántas personas abren la carta, escanean el QR o tocan «Llamar» | saber si la carta digital funciona | Must | RF-14 |
| **HU-14** | imprimir la carta o guardarla en PDF | tener una versión física o compartirla | Must | RF-07 |

---

## 3. Estado

- **Fase 0 (fundaciones):** ✅ base de datos, semilla, almacén de imágenes y tokens de diseño listos para las historias HU-01 a HU-14.
- **Siguientes:** HU-01 a HU-06 y HU-14 en la Fase 1; HU-07 a HU-11 en la Fase 2; HU-12 y HU-13 en la Fase 3.

> ⚠️ **Pendiente de validación humana:** si en el futuro hace falta más de una cuenta de administrador.
