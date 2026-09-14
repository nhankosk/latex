# Rotas — apresentação do artigo

Aplicação educacional de Professor Jackson de Oliveira, baseada no artigo de Jackson de Oliveira e Vanda Maria Luchesi: **Algoritmos genéticos e o problema do caixeiro viajante: experimentos computacionais e possibilidades para o ensino médio**.

O experimento principal é o Caso 1 da dissertação, desenvolvido na seção 3 do artigo: visita a oito pontos de um campus escolar hipotético. Os Casos 2 e 3 complementam a comparação experimental.

## Aplicação

Apresentação em português com seis áreas: o trabalho, experimento, método, resultados, sala de aula e fontes. O experimento permite execução automática ou passo a passo, comparação com o ótimo e com o vizinho mais próximo, inspeção das elites e da população e alteração dos parâmetros.

O cenário usa recursos 2D isométricos de Kenney (CC0) e PixiJS (MIT). A interface adapta-se a computador e celular. Os elementos do campus são ilustrações de um ambiente hipotético.

## Conteúdo científico

- Caso 1: dissertação §5.2 → artigo §3; campus escolar, 8 pontos, distâncias euclidianas, escala de 50 m por unidade.
- Caso 2: dissertação §5.3 → artigo §4.2; 12 pontos, distâncias de Manhattan.
- Caso 3: dissertação §5.4 → artigo §4.3; 15 pontos, grade com obstáculos.
- São enumeradas 2.520 rotas simétricas distintas no Caso 1. Ótimo: 1.084,945435870697 m; vizinho mais próximo: 1.143,5859274169068 m.
- As execuções no navegador usam Mulberry32 e não reproduzem o gerador de Python. Os resultados originais do artigo aparecem separadamente na aba Resultados. A trajetória animada é calculada ao vivo, sem população inicial preparada com o ótimo.
- A sequência de ensino é uma proposta, sem validação de aprendizagem em sala de aula no artigo.

## Executar e verificar

Requer Python 3 com Pillow, Node.js e acesso à internet para baixar os recursos de arte.

```sh
python -m pip install Pillow
python apresentacao/build.py
python -m http.server 4173 --directory dist
```

Verificação matemática: `node apresentacao/test-engine.cjs`.

Verificação da interface: instale `playwright@1.55.0`, execute `npx playwright install --with-deps chromium` e `node apresentacao/qa.cjs`. A verificação cobre animação, pausa, referências, fases didáticas, parâmetros, navegação e largura de tela. As capturas são gravadas em `dist/qa/`.

A automação do repositório preserva a aplicação compilada no ramo `apresentacao-web`. A hospedagem principal utiliza Sites; a identidade persistente está em `.openai/hosting.json`.

## Organização

- `engine.js`: matriz de distâncias, enumeração exata, vizinho mais próximo, OX, PMX, torneios, mutação e elitismo.
- `app.js`: estado da simulação, representação gráfica e navegação.
- `index.html` e `style.css`: apresentação, conteúdo e visual responsivo.
- `build.py`: preparação dos recursos e da aplicação estática.
- `test-engine.cjs` e `qa.cjs`: verificações numéricas e de integração.

Fontes de arte: [Isometric City](https://opengameart.org/content/isometric-city), [Isometric Buildings #1](https://opengameart.org/content/isometric-buildings-1), [Isometric Vehicles #1](https://opengameart.org/content/isometric-vehicles-1).
