# Salesforce Certifications Quiz

Plataforma de estudo para certificações Salesforce. Repositório único com quizzes independentes por certificação, todos no mesmo padrão visual.

## Certificações disponíveis

| Certificação | Pasta | Aprovação |
|---|---|---|
| Advanced Administrator | `/advadministrator` | 65% |
| Agentforce Specialist | `/agentforce` | 65% |
| Data Cloud Consultant | `/dataclaude` | 65% |

## Como funciona

- A página inicial (`/`) lista todas as certificações disponíveis
- Cada certificação tem seu próprio `index.html` e arquivo `.json` de questões
- O CSS (`style.css`) e o script do quiz (`quiz.js`) são compartilhados entre todas as certificações
- As questões são embaralhadas a cada tentativa
- Suporte a questões de múltipla escolha (múltiplas respostas corretas)

## Estrutura do projeto

```
/
├── index.html              ← Hub: lista de certificações
├── style.css               ← Estilos compartilhados
├── quiz.js                 ← Lógica do quiz (compartilhada)
├── favicon-16x16.png
├── advadministrator/
│   ├── index.html
│   └── advadministrator.json
├── agentforce/
│   ├── index.html
│   └── agentforce.json
└── dataclaude/
    ├── index.html
    └── data_cloud_consultant.json
```
