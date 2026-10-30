# Arquitetura e decisões técnicas

Este documento complementa o [README](README.md) e descreve como o protótipo KURIO está organizado.

## Interface e navegação

- **React 19 + TypeScript** estruturam os fluxos. Os estilos combinam Tailwind CSS com CSS específico da interface e componentes reutilizáveis.
- **TanStack Router** mantém a navegação entre catálogo, detalhe, carrinho, autenticação, checkout, conta, carteiras e ajuda.
- Na Home, os filtros, busca, ordenação e paginação são refletidos na **URL**, permitindo atualização e retorno pelo histórico do navegador.
- A interface contempla barra inferior mobile, carregamentos, estados vazios, avisos de falha e controles operáveis por teclado.

## API e estado

- `src/lib/api.ts`: cliente Axios e tratamento das respostas.
- `src/mocks/handlers.ts`: contratos HTTP simulados por Mock Service Worker, separados da lógica de interface.
- `src/mocks/db.ts`: catálogo e dados demonstrativos persistidos por origem no `localStorage`; usuários têm carrinho, favoritos e carteiras isolados por identidade simulada.
- **TanStack Query** administra cache, revalidação e estados das requisições. Login/logout e alterações de recursos invalidam as consultas relevantes.
- A autenticação é **simulada**, não utiliza servidor real ou cookies HttpOnly. Não é uma implementação de segurança destinada à produção.

## Compra, pagamentos e consistência

- A camada `src/lib/eth.ts` realiza os cálculos monetários em inteiros (`BigInt`, unidade wei) e converte valores decimais na entrada e saída, evitando somar ETH com ponto flutuante.
- O checkout valida os dados do colecionador e a carteira conectada, recupera uma cotação e exige nova revisão após mudanças no preço.
- A API simulada usa **chaves de idempotência** para impedir criação duplicada de pedidos; uma chave reutilizada com dados incompatíveis retorna conflito.
- Há cenários de pagamento recusado, conexão indisponível, timeout e recuperação do pedido pela chave de idempotência.
- O recibo descreve o estado **simulado** da compra; não existe assinatura criptográfica nem transação blockchain.

## Atualizações em tempo real

- `src/lib/realtime.ts`: cliente Socket.IO.
- `src/mocks/socket.ts`: eventos de demonstração para mudanças de NFT e pedido, integrados ao MSW via binding.
- Eventos têm identificadores/versões para reduzir processamento duplicado e o cliente pode reconciliar dados ao reconectar.
- Não há serviço Socket.IO remoto ou infraestrutura blockchain em produção.

## Recursos complementares

- **Central de Ajuda:** página `/help` com orientações e tópicos ligados ao rodapé.
- **Diário da Cunhagem:** conteúdo editorial na Home.
- **Leitor QR:** câmera ou imagem por `BarcodeDetector` quando compatível, mais opção manual de ID/link.
- **Avaliações:** consultas e envio de comentários pela API mock para sessões autenticadas.

## Testes e inspeção

- `tests/*.spec.ts`: cenários Playwright em desktop e mobile, incluindo autenticação, navegação, compra, falhas e eventos.
- `scripts/check-core.mjs`: verificações básicas de precisão monetária e isolamento/expiração da sessão.
- `scripts/lighthouse-audit.mjs`: execução automatizada em quatro cenários (Home/detalhe × mobile/desktop) com três medições cada.

A execução de `npm run verify` compartilhada em **30/10/2026** concluiu com **74 testes funcionais aprovados** e sem falhas. Consulte [AUDIT-STATUS.md](AUDIT-STATUS.md) para os resultados de regressão visual e Lighthouse, bem como as metas ainda não verificadas.

## Limites assumidos

Os mocks atendem à proposta de demonstração: persistência local, transações e carteiras fictícias e atualizações simuladas. Para uma aplicação real seriam necessários backend com persistência remota, autenticação segura, integração auditada com carteiras/blockchain e políticas operacionais de produção. Nenhuma dessas integrações é apresentada como pronta neste projeto.
