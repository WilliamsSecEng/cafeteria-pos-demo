# Cafetería POS Demo

Sistema web de ventas para cafeterías, snack bars y negocios de comida rápida.

## Módulos incluidos

- Login con roles de administrador y cajero
- Punto de venta POS
- Registro de ventas
- Métodos de pago: efectivo, QR, tarjeta y mixto
- Control de caja
- Apertura y cierre de caja
- Ingresos y egresos manuales
- Inventario básico
- Alertas de bajo stock
- Reportes de ventas
- Productos más vendidos
- Ticket promedio
- Ventas por método de pago
- Página comercial de presentación

## Tecnologías

- Frontend: React, Vite, TypeScript, Tailwind CSS
- Backend: Node.js, Express, TypeScript
- Base de datos: PostgreSQL
- ORM: Prisma
- Autenticación: JWT

## Usuarios demo

Administrador:

```text
admin@cafeteria.com
admin123

Cajero:
´´´text
cajero@cafeteria.com
cajero123

## Instalacion local

Backend:
´´´text
cd backend
npm install
cp .env.example .env
npx prisma migrate dev
npx prisma db seed
npm run dev

Frontend:
´´´text
cd frontend
npm install
npm run dev

Rutas Principales:
´´´text
/demo
/login
/
/ventas
/caja
/reportes