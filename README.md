# Operación Horno 4.0

Dashboard web para el proyecto de control térmico con ESP32 y sensor LM35. La interfaz incluye ajuste de consigna, configuración de límite térmico por horno, indicador de cuatro focos, gráfica térmica, exportación CSV y una simulación local ilustrativa.

## Iniciar en desarrollo

Requiere Node.js y pnpm.

```bash
pnpm install
pnpm dev
```

Vite mostrará la dirección local del dashboard en la terminal.

## Estado actual

- La simulación es local e ilustrativa; no controla el ESP32.
- La lectura real del LM35 y las órdenes confirmadas a los focos todavía requieren integrar la comunicación con el hardware.
- La constante térmica y el límite del recipiente deben definirse y validarse con el horno real antes de usar el sistema.

El proyecto original de Figma Make se conserva en `Thermal Control Dashboard UI.make`. Los requisitos funcionales están en `¿Qué debe llevar el dashboard.txt`.
