# Visualização do campo elétrico

O simulador soma o campo de todas as cargas em cada ponto. O painel esquerdo oferece linhas de campo, uma grade de vetores da resultante e uma sonda arrastável; as camadas podem ser combinadas. A cena inicia vazia, com linhas ativadas no plano XZ.

## Unidades e leitura

- Cargas são editadas em **µC** e convertidas para coulombs na entrada do core. Posições e distâncias estão em **metros**, campo em **N/C**, forças em **N**.
- A constante de Coulomb é `8.9875517923e9 N m²/C²`. Por exemplo, uma carga de `1 µC` produz aproximadamente `8987.552 N/C` a `1 m`.
- A resultante sempre considera todas as cargas. Ocultar uma contribuição individual esconde apenas sua seta na sonda.
- Na grade, comprimento uniforme enfatiza direção; comprimento logarítmico enfatiza intensidade. A coloração opcional também usa escala logarítmica, com teto automático no percentil 95 das amostras. Valores acima do teto compartilham a última cor; a leitura física da sonda não é limitada.
- Na sonda, todos os vetores usam uma única escala linear. O paralelogramo aparece quando existem exatamente duas contribuições não nulas e ambas estão visíveis.

## Controles

- **Plano / Volume 3D:** alterna câmera ortográfica e câmera com rotação livre. Os cortes XY, XZ e YZ têm posição ajustável. O botão **Enquadrar campo** centraliza a vista nas cargas atuais.
- **Linhas / Vetores / Sonda:** camadas independentes. `E` mostra ou esconde o conjunto do campo; `F` controla as forças e `R`, as distâncias.
- A sonda pode ser arrastada pelo ponto violeta ou posicionada pelas coordenadas. No plano, a coordenada perpendicular acompanha o corte; no volume, o arraste ocorre paralelamente à tela.
- Clique seleciona cargas; Shift + clique modifica a seleção; Ctrl + arraste move cargas; Delete remove a seleção. A cor da carga continua editável e o símbolo identifica o sinal.

## Interpretação dos cortes e limites

Quando há cargas fora do corte, linhas e setas representam a **projeção tangencial** do campo nesse plano, indicada no painel. A sonda continua mostrando as três componentes reais. As linhas são integrais da direção do campo, não trajetórias dinâmicas de partículas.

O domínio acompanha as cargas, com extensão mínima de 8 m. Linhas são interrompidas nos limites do domínio, em regiões de campo nulo e junto às cargas. A região de exclusão tem raio igual ao maior entre o raio visual e 0,2 m; a sonda identifica essa região em vez de inventar uma leitura finita.

O traçado usa RK4, sementes circulares no plano e distribuição esférica de Fibonacci no volume. Integração reversa representa fontes negativas; conexões reversas com fontes positivas são descartadas para evitar duplicar essas linhas. A densidade é ilustrativa, com até 256 sementes e 1100 passos por curva. A grade tem até 841 amostras no plano ou 2197 no volume.

Um Web Worker calcula a geometria em lotes interrompíveis; respostas de versões antigas são descartadas. A sonda usa diretamente a mesma função física. Materiais, geometrias, eventos e worker são liberados ao desmontar a cena.

## Verificação rápida

Execute `npm test` para os testes numéricos de Coulomb, superposição, singularidades, forças, conexões do dipolo, cargas negativas isoladas e cortes. Execute `npm run build` para conferir os tipos e a compilação da aplicação e do worker.

Para conferir a interface, adicione `+1 µC` em `(-1, 0, 0)` e `-1 µC` em `(1, 0, 0)`. A sonda na origem deve indicar aproximadamente `17975.104 N/C` no sentido positivo de X; em `(0, 0, 1)`, aproximadamente `6355.159 N/C`. Alterne Plano/Volume e oculte uma contribuição: a resultante deve permanecer igual.
