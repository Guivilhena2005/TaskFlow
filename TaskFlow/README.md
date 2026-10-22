# TaskFlow — Todo List com LocalStorage

Projeto de atividade acadêmica desenvolvido com **HTML, CSS e JavaScript puro**, executado diretamente no navegador.

## Como executar

1. Extraia o arquivo ZIP para uma pasta.
2. Abra a pasta.
3. Dê dois cliques em `index.html` ou abra esse arquivo no navegador.
4. Clique em **Nova tarefa** para começar.

Não é necessário instalar dependências, configurar servidor ou criar banco de dados. A fonte tipográfica usa Google Fonts quando houver internet; sem conexão, o sistema usa fontes alternativas locais.

## Funcionalidades

- CRUD completo: criar, consultar, editar e excluir tarefas.
- Campos: título, descrição opcional, prioridade, status e prazo.
- Status: Pendente, Em andamento e Concluída.
- Prioridade: Alta, Média e Baixa.
- Ordenação por prioridade, prazo, data de criação ou ordem alfabética.
- Filtros por status e prioridade, além de busca por título/descrição.
- Indicadores de total, tarefas em andamento, concluídas e prazos vencidos.
- Persistência com `localStorage`.
- Interface responsiva, controles acessíveis e mensagens de feedback.
- Validação de título (3 a 100 caracteres) e descrição (até 500 caracteres).
- Confirmação antes de excluir.

## Armazenamento

As tarefas ficam no armazenamento local do navegador, na chave `taskflow.tasks.v1`. Elas permanecem disponíveis no mesmo navegador e perfil, enquanto os dados locais não forem apagados. O armazenamento não sincroniza entre dispositivos nem substitui um banco de dados remoto.

## Critérios de teste manual

1. Criar tarefa com título válido, prioridade alta, status pendente e prazo futuro.
2. Tentar salvar título vazio ou com menos de 3 caracteres; o sistema deve impedir.
3. Editar o título e a prioridade; as alterações devem aparecer na lista.
4. Marcar tarefa como concluída; o status e os indicadores devem atualizar.
5. Reabrir tarefa concluída pelo botão de conclusão.
6. Excluir uma tarefa e cancelar outra exclusão para verificar a confirmação.
7. Criar tarefas com prioridades alta, média e baixa e conferir a ordenação padrão.
8. Escolher ordenação por prazo; tarefas com prazo mais próximo devem aparecer primeiro, sem prazo por último.
9. Pesquisar parte de um título e testar filtros por status/prioridade.
10. Recarregar a página; as tarefas devem continuar presentes.
11. Testar um prazo anterior a hoje; deve ser identificado como vencido, desde que a tarefa não esteja concluída.
12. Redimensionar o navegador para celular; os cartões, filtros e formulário devem continuar utilizáveis.

## Decisões de implementação

- IDs únicos identificam tarefas durante a edição e exclusão.
- O conteúdo digitado é escapado antes de ser inserido no HTML, reduzindo o risco de injeção de marcação.
- Falhas de leitura ou escrita do `localStorage` são tratadas com mensagens de feedback.
- A ordenação padrão usa prioridade (alta → média → baixa), depois prazo mais próximo e, por fim, data de criação.
- Tarefas sem prazo ficam no fim ao ordenar por prazo.
- Ao marcar como concluída, a tarefa recebe status concluído; ao reabrir pelo botão rápido, volta para pendente. O status também pode ser definido no formulário de edição.
