# Capacitor Android - app `colaborador`

Este app usa **Vite** e gera build em `dist/`.

## Pré-requisitos

- Node.js 18+
- npm 9+
- **JDK 17** (recomendado pelo Android Gradle Plugin atual)
- Android Studio **Giraffe (2022.3.1)** ou superior
- Android SDK com:
  - Android API 34 (recomendado)
  - Android SDK Platform-Tools
  - Android SDK Build-Tools
  - Android Emulator

## 1) Instalar dependências

Na raiz do monorepo:

```bash
npm install
```

> Como este app usa `capacitor.config.ts`, o **TypeScript é obrigatório** para os comandos do Capacitor funcionarem.
> Instalação rápida no workspace:
>
> ```bash
> npm --workspace apps/colaborador install -D typescript @types/node
> ```

## 2) Build web do app

```bash
npm --workspace apps/colaborador run build
```

## 3) Criar projeto Android (primeira vez)

```bash
npm --workspace apps/colaborador run cap:add:android
```

> O script é cross-platform (Windows/macOS/Linux).
> Se `apps/colaborador/android` já existir, ele apenas informa e finaliza sem erro.

## 4) Sincronizar assets/plugins com Android

```bash
npm --workspace apps/colaborador run cap:sync:android
```

## 5) Abrir no Android Studio

```bash
npm --workspace apps/colaborador run cap:open:android
```

## 6) Rodar no emulador Android

1. Abra `apps/colaborador/android` no Android Studio.
2. Vá em **Device Manager** e inicie um emulador.
3. Clique em **Run 'app'**.

Opcional via CLI (com device já conectado/emulador aberto):

```bash
npm --workspace apps/colaborador run cap:run:android
```

## 7) Debug WebView com Chrome DevTools

1. Rode o app no emulador/dispositivo.
2. Abra no Chrome desktop: `chrome://inspect/#devices`.
3. Clique em **inspect** na WebView do app `Colaborador`.
4. Use Console/Network/Elements normalmente.

## Scripts disponíveis no workspace

- `cap:add:android`: build + add Android (idempotente)
- `cap:sync:android`: build + sync Android
- `cap:open:android`: abre projeto Android no Android Studio
- `cap:run:android`: build + sync + run Android
