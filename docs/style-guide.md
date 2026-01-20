# 🎨 Style Guide Oficial — Sistema de Cores  
## Gestor de Escalas

**Versão:** v1.1  
**Status:** Ativo  
**Escopo:** Obrigatório para todo o projeto  

Este documento define o **sistema oficial de cores** do Gestor de Escalas.  
Todo novo componente, tela ou refatoração **deve seguir estas regras**.

---

## 1. Princípios Fundamentais

O sistema de cores do Gestor de Escalas é **semântico**, não decorativo.

Regras inegociáveis:
- Nunca usar cores hard-coded (`bg-green-500`, `text-red-600`, etc.).
- Nunca pintar cards inteiros com cores fortes.
- Nunca usar vermelho para avisos (warning).
- Sempre usar tokens semânticos.
- Cores devem ser aplicadas em camadas suaves (`/10`, `/20`).
- Componentes não decidem cores — o Design System decide.

---

## 2. Arquitetura de Cores

O sistema é dividido em três camadas complementares.

### 2.1 CSS Variables (Base do Layout)

As CSS variables definem o comportamento global do layout, incluindo:
- fundo da aplicação
- texto principal
- hero
- bordas
- dark mode

Exemplos:
```
--background
--foreground
--primary
--border
--muted
```

Nunca utilizar valores hexadecimais diretamente no layout base.

---

### 2.2 Tokens Semânticos (Tailwind)

Os tokens semânticos representam **significado e estado**, nunca estética.

Tokens oficiais:
- `primary` → identidade e ação principal
- `success` → confirmação, presença, sucesso
- `warning` → pendente, atenção, aguardando ação
- `destructive` → erro, recusa, ações irreversíveis
- `info` → informação neutra, contadores, apoio visual

---

### 2.3 Componentes

Nenhum componente define cor manualmente.  
Todos consomem tokens semânticos via `variant`.

---

## 3. Paleta Oficial (Light Mode)

### Primary — Identidade do App
```
primary:            #1E6FD9
primary-foreground: #FFFFFF
```

### Success — Confirmação
```
success:        #22C55E
success/10:     fundo
success/20:     borda
```

### Warning — Pendente / Atenção
```
warning:        #F59E0B
warning/10:     fundo
warning/20:     borda
```

### Destructive — Erro / Recusa
```
destructive:        #EF4444
destructive/10:     fundo
destructive/20:     borda
```

### Info — Informativo
```
info:        #0EA5E9
info/10:     fundo
info/20:     borda
```

---

## 4. Componentes

### Buttons
Use sempre variantes semânticas (`default`, `success`, `warning`, `destructive`, `outline`).

### Badges
Padrão obrigatório:
- Fundo: `color/10`
- Texto: `color`
- Borda: `color/20`

### Cards
Nunca usar cores fortes no fundo.  
Cards são sempre neutros.

---

## 5. Hero

```
bg-gradient-to-r from-primary to-primary/80
```

---

## 6. Dark Mode

- Mesmos tokens
- Fundos não totalmente pretos
- Contraste confortável

---

## 7. Checklist de PR

- Usou tokens semânticos?
- Removeu cores hard-coded?
- Badge correto?
- Button com variant?
- Funciona em dark mode?

---

## 8. Status Final

Este documento é a **referência oficial** do projeto.
