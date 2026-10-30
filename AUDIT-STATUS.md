# Resultados de validação — KURIO

**Data de referência:** 30/10/2026 · **Ambiente reportado:** macOS, Node.js v24.21.0.

Este arquivo registra resultados **efetivamente informados durante a validação local** e distingue os testes funcionais das auditorias de qualidade. Não inclui resultados inventados nem substitui a execução na máquina do avaliador.

## Build e testes funcionais

O comando `npm run verify` concluiu com sucesso:

| Etapa | Resultado |
| --- | --- |
| Instalação (`npm ci`) | Concluída, sem vulnerabilidades reportadas |
| Lint | Aprovado |
| TypeScript (`tsc --noEmit`) | Aprovado |
| Verificações básicas | Aprovadas |
| Build de produção (`tsc -b && vite build`) | Aprovado |
| Playwright E2E (desktop e mobile) | **74 aprovados / 74 executados; 0 falhas** |

O Playwright verificou, entre outros fluxos: cadastro, login/logout, isolamento de sessão, catálogo e filtros, carrinho, cupom, checkout, avaliações, perfil, carteiras, atualização por Socket.IO, idempotência, falhas simuladas e recuperação de pedidos.

Houve um aviso **não bloqueante** do Vite para um chunk JavaScript maior que 500 kB. O build foi concluído normalmente.

## Testes visuais

Uma execução anterior registrou **8/8 cenários aprovados** após gerar baselines no ambiente macOS, cobrindo Home, detalhe, carrinho e checkout em desktop e mobile. A última alteração funcional concentrou-se na sincronização do teste de logout; a suíte visual **não foi novamente reportada após essa alteração**.

Snapshots gerados a partir da própria aplicação verificam regressões entre execuções; para avaliar fidelidade visual, também devem ser comparados manualmente às telas do Figma.

## Lighthouse: último conjunto completo de medições compartilhado

O script consolida a mediana de três execuções por cenário.

| Página | Perfil | Performance | Acessibilidade | Boas práticas | SEO | Metas completas? |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Home | Mobile | **90** | **94** | **100** | **92** | Não |
| Home | Desktop | **100** | **92** | **100** | **92** | Não |
| Detalhe | Mobile | **91** | **100** | **100** | **92** | Sim |
| Detalhe | Desktop | **100** | **96** | **100** | **92** | Sim |

**Metas do desafio:** Performance ≥ 90, Acessibilidade ≥ 95, Boas práticas ≥ 95, SEO ≥ 90.

- **Atingidas nas quatro combinações:** Performance, Boas práticas e SEO.
- **Abaixo da meta na Home:** Acessibilidade em mobile (94) e desktop (92).
- As tentativas posteriores de auditoria registradas no terminal foram interrompidas por encerramento do preview; não fornecem novas pontuações para substituir a tabela.

Os relatórios individuais HTML/JSON são criados por `npm run audit:lighthouse` em `reports/lighthouse/`. Como são arquivos gerados, não acompanham o repositório; as verificações podem ser repetidas.

## Reprodução rápida

```bash
npm ci
npm run verify
```

Em seguida, em um terminal:

```bash
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

Em outro terminal, mantendo o preview aberto:

```bash
npm run audit:lighthouse
```

O projeto mantém os testes e mocks no pacote. Arquivos gerados como `dist/`, `node_modules/`, `test-results/` e `reports/` não precisam ser versionados.

## Observações para avaliação

A aplicação foi implementada como protótipo frontend com API e eventos **simulados**. O comportamento foi validado em navegadores desktop e mobile via Playwright. A conformidade total de acessibilidade da Home e a execução do deploy público ainda dependem de verificações próprias; não são declaradas como concluídas neste registro.
