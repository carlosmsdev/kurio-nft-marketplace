# KURIO — NFT Marketplace

**Projeto desenvolvido para o Frontend Challenge da Jungle Gaming.**

**React 19 · TypeScript · Vite · TanStack Router/Query · MSW · Socket.IO · Playwright**

O **KURIO** é um marketplace demonstrativo de colecionáveis digitais, com interface responsiva baseada no [Figma disponibilizado para o desafio](https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge?node-id=0-1). A proposta foi transformar as telas em uma experiência navegável, com catálogo, autenticação, gestão de carteiras, carrinho e finalização de pedidos, incluindo estados de carregamento e falha.

![Prévia da identidade visual do KURIO](public/hero-emerald.webp)

> **Sobre a demonstração:** o fluxo de autenticação, as carteiras, os pagamentos e os pedidos usam uma API **simulada com Mock Service Worker (MSW)**. As atualizações em tempo real também são simuladas. Nenhuma operação movimenta criptomoedas ou grava transações reais em blockchain.

## Como executar

**Pré-requisitos:** Node.js 22.12+ (execução validada com Node.js 24.21.0), npm e navegador Chromium/Chrome atualizado.

```bash
npm ci
npm run dev
```

Abra **http://localhost:5173/**. O serviço mock é inicializado automaticamente nos comandos de desenvolvimento e build. O catálogo sincroniza automaticamente as referências das imagens ao abrir uma versão mais recente, preservando os dados de demonstração já salvos no navegador.

### Credenciais e dados de demonstração

| Recurso | Valor |
| --- | --- |
| Conta principal | `demo@kurio.test` |
| Conta alternativa | `alex@kurio.test` |
| Senha das contas | `Demo123!` |
| Cupom de desconto | `SAVE10` |
| Cupom expirado | `EXPIRED` |

São informações fictícias, exclusivas da demonstração. Não utilize credenciais nem dados de carteiras reais.

## Experiência principal

| Área | O que foi implementado |
| --- | --- |
| **Home e catálogo** | NFTs em destaque, busca, filtros por categoria/rede, ordenação e navegação com parâmetros persistidos na URL |
| **Detalhes da obra** | Imagens, informações da coleção, disponibilidade, avaliações, favoritos e compra direta |
| **Carrinho** | Inclusão e remoção de itens, quantidades, cupom de desconto e cálculo de totais em ETH |
| **Checkout** | Identificação do colecionador, escolha de carteira e rede, validação dos campos obrigatórios, revisão da cotação e confirmação |
| **Pedidos** | Recibo e acompanhamento dos estados de pagamento simulado |
| **Conta** | Login, cadastro, logout, edição de perfil, favoritos e gerenciamento de carteiras |
| **Responsividade** | Layout para desktop e mobile, com navegação inferior em telas menores |

## Funcionalidades complementares e decisões de produto

Além dos fluxos principais, desenvolvi recursos para deixar a aplicação mais completa e demonstrar como o marketplace poderia evoluir como produto:

- **Central de Ajuda (`/help`)** — conteúdo próprio sobre compra de NFTs, uso de carteiras, segurança, limites da plataforma e recuperação de erros. O rodapé oferece acesso a essa página. É uma área informativa; não existe atendimento humano integrado.
- **Diário da Cunhagem** — seção editorial na Home com textos educativos sobre propriedade digital, artistas e colecionismo. Os cards abrem o conteúdo dentro da aplicação.
- **Leitor de QR Code no mobile** — acesso rápido à página de um NFT por câmera ou imagem, quando o navegador oferece suporte a `BarcodeDetector`; também há **entrada manual de ID ou link** para compatibilidade.
- **Avaliações de colecionadores** — visualização de notas/comentários e publicação simulada por usuário autenticado, com validações de formulário.
- **Experiência de uso e acessibilidade** — estados de carregamento, mensagens de erro, feedback de ações, foco por teclado e mensagens para situações de conexão indisponível.
- **Tratamento de cenários reais de produto** — expiração de sessão, erros de rede, pagamento recusado, timeout, alteração de preço durante a compra, proteção contra pedidos duplicados e sincronização de atualizações.

Esses complementos foram incluídos para ir além de reproduzir o layout: a intenção foi mostrar navegação integrada, consistência dos estados e caminhos de recuperação. Os recursos que dependem de serviços externos permanecem **simulados**, respeitando o caráter do desafio.

## Tecnologias e organização

- **React + TypeScript + Vite:** interface, tipagem e compilação.
- **Tailwind CSS e componentes no padrão shadcn/ui:** estilos e elementos reutilizáveis.
- **TanStack Router:** rotas e estados de busca na URL.
- **TanStack Query + Axios:** requisições, cache, invalidação e tratamento de erros.
- **MSW:** simulação das rotas HTTP, persistência local e cenários de erro.
- **Socket.IO com binding MSW:** atualização demonstrativa de preços e pedidos.
- **Playwright:** testes funcionais desktop/mobile e regressão visual.
- **Lighthouse:** auditoria de performance, acessibilidade, boas práticas e SEO.

```text
src/
  components/     Interface e leitor de QR Code
  lib/            HTTP, tempo real e cálculos em ETH
  mocks/          API simulada, dados e eventos
  screens.tsx     Páginas e fluxos da aplicação
  router.tsx      Rotas do marketplace
public/           Imagens, ícones e Service Worker
tests/            Testes funcionais e visuais
scripts/          Lint, verificações básicas e Lighthouse
```

Para decisões de implementação, consulte [ARCHITECTURE.md](ARCHITECTURE.md).

## Testes e qualidade

A versão entregue foi testada localmente em macOS, com **Node.js v24.21.0**. No último `npm run verify` informado, o lint, a checagem de tipos, os testes básicos, o build e os **74 testes funcionais (74 aprovados, 0 falhas)** passaram.

```bash
npm run verify
```

O comando executa automaticamente as verificações e os testes E2E. É importante manter a **porta 4173 livre** durante o Playwright, pois ele inicia seu próprio servidor.

Para testes visuais:

```bash
npm run test:visual:update
npm run test:visual
```

As oito capturas visuais passaram em uma execução anterior no macOS. As referências são geradas no ambiente local e devem ser revisadas em comparação com o Figma; um snapshot aprovado não equivale, por si só, a fidelidade pixel a pixel. As imagens de referência e relatórios temporários não acompanham este ZIP.

### Auditoria Lighthouse

Em um terminal:

```bash
npm run build
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

Deixe o preview aberto e, em **outro terminal**, execute:

```bash
npm run audit:lighthouse
```

O script coleta três medições para Home e detalhe, em desktop e mobile. Na última auditoria completa compartilhada, **Performance, Boas práticas e SEO atingiram as metas nos quatro cenários**. A acessibilidade da Home ficou em **94 (mobile) e 92 (desktop)**, ainda abaixo da meta de 95. Os números e as observações de validação estão em [AUDIT-STATUS.md](AUDIT-STATUS.md).

## Rotas disponíveis

| Rota | Página |
| --- | --- |
| `/` | Home, coleções e conteúdos |
| `/nft/1` | Detalhes de um NFT e avaliações |
| `/cart` | Carrinho |
| `/checkout` | Revisão da compra simulada |
| `/order/:id` | Recibo e acompanhamento do pedido |
| `/login`, `/register` | Autenticação em modal |
| `/account` | Perfil, favoritos e histórico |
| `/wallets` | Carteiras de demonstração |
| `/help` | Central de Ajuda |

## Publicação na Vercel

| Configuração | Valor |
| --- | --- |
| Framework | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Variável opcional | `VITE_ENABLE_MOCKS=true` |

O projeto contém `vercel.json` para permitir abrir rotas diretamente e atualizar a página. A API simulada é iniciada por padrão, exceto se `VITE_ENABLE_MOCKS=false`; ao desabilitá-la, será necessária uma API real compatível.

Após publicar, recomendo conferir diretamente no domínio: Home, login, carrinho, checkout, `/nft/1`, acesso a páginas protegidas e atualizações simuladas em tempo real. **Não envie `node_modules`, `dist`, `test-results`, `playwright-report` nem `reports` para o repositório**; eles são gerados localmente e estão ignorados pelo Git.

## Observações finais

O projeto representa um **protótipo funcional para avaliação frontend**, não uma plataforma financeira pronta para produção. O objetivo foi equilibrar fidelidade visual, organização do código, fluxos utilizáveis e comportamento consistente frente a erros. Contatos e elementos institucionais ilustrativos da interface não representam canais de suporte ativos.

**Referências:** [repositório do desafio](https://github.com/junglegaming/frontend-challenge) · [Figma](https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge?node-id=0-1).
# kurio-nft-marketplace
