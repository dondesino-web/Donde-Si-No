# Política de Seguridad (SECURITY.md)

## Definición del documento

- **Para qué sirve:** define las pautas para reportar vulnerabilidades de seguridad de forma responsable y las directrices de protección de datos y secretos.
- **Cuándo se crea o actualiza:** al inicio del proyecto y cuando cambien los canales de contacto de seguridad.
- **Qué debe contener:** reporte responsable, versiones soportadas, política de secretos y dependencias.

---

## 1. Versiones Soportadas

| Versión | Soportada |
|---|---|
| Rama `main` (Astro v7) | :white_check_mark: |
| Versiones anteriores | :x: |

---

## 2. Reporte Responsable de Vulnerabilidades

Si descubres una vulnerabilidad de seguridad en este repositorio, por favor **NO abras un issue público**. En su lugar:

1. Abre un **Security Advisory** privado directamente en la pestaña de Seguridad del repositorio de GitHub: `https://github.com/jhonabruzzi278/Donde-Si-No/security/advisories`
2. O contacta directamente al responsable del repositorio (`jhonabruzzi278`) a través de los canales privados de GitHub.

---

## 3. Manejo de Secretos y Dependencias

- **Secretos:** Está terminantemente prohibido almacenar credenciales, API keys o tokens en el código fuente. Usa archivos `.env` locales (ignorados en `.gitignore`).
- **Dependencias:** Se ejecutan auditorías periódicas con `npm audit` para mitigar vulnerabilidades en paquetes de terceros.
