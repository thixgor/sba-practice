# Importacao de Questoes via TXT - Tutorial Completo

Este documento descreve como formatar arquivos `.txt` para importar questoes em massa no SBA Practice System.

---

## Regras Gerais

1. Cada questao e separada por uma linha contendo apenas `---` (tres tracos).
2. Cada campo e definido por uma diretiva no formato `@DIRETIVA: valor`.
3. Valores podem ocupar multiplas linhas, ate a proxima diretiva.
4. O arquivo deve ser salvo em **UTF-8**.
5. Linhas em branco antes da primeira diretiva de cada bloco sao ignoradas.
6. O tipo de avaliacao (pre-teste, pos-teste, prova, simulacao, prova-video, simulado-evolutivo) determina quais diretivas sao aceitas.

---

## 1. Questoes Padrao (Pre-Teste, Pos-Teste, Prova, Simulacao)

Estes quatro tipos usam o mesmo formato de questao. Suportam questoes de **multipla escolha** e **discursivas**.

### 1.1 Questao de Multipla Escolha

**Diretivas obrigatorias:**
| Diretiva | Descricao |
|---|---|
| `@TIPO` | `multipla` |
| `@ENUNCIADO` | Texto da questao (minimo 5 caracteres) |
| `@ALTERNATIVA_A` | Texto da alternativa A |
| `@ALTERNATIVA_B` | Texto da alternativa B |
| `@GABARITO` | Letra correta (A, B, C, D ou E) |

**Diretivas opcionais:**
| Diretiva | Descricao |
|---|---|
| `@ALTERNATIVA_C` | Texto da alternativa C |
| `@ALTERNATIVA_D` | Texto da alternativa D |
| `@ALTERNATIVA_E` | Texto da alternativa E |
| `@RESPOSTA_COMENTADA` | Explicacao da resposta correta |
| `@FONTE` | Referencia bibliografica |
| `@IMAGEM_URL` | URL de uma imagem para a questao |
| `@VIDEO_URL` | URL de video (YouTube/Vimeo) para a questao |
| `@PONTUACAO` | Valor da questao (padrao: 1) |

**Exemplo completo:**

```
@TIPO: multipla
@ENUNCIADO: Qual dos seguintes agentes inalatorios possui a menor CAM (Concentracao Alveolar Minima)?
@ALTERNATIVA_A: Sevoflurano (CAM 2.0%)
@ALTERNATIVA_B: Desflurano (CAM 6.0%)
@ALTERNATIVA_C: Isoflurano (CAM 1.15%)
@ALTERNATIVA_D: Halotano (CAM 0.75%)
@ALTERNATIVA_E: Oxido nitroso (CAM 104%)
@GABARITO: D
@RESPOSTA_COMENTADA: O halotano possui CAM de 0.75%, a menor entre os agentes listados. O oxido nitroso tem a maior CAM (104%), sendo o menos potente.
@FONTE: Miller's Anesthesia, 9th Edition, Chapter 26
---
@TIPO: multipla
@ENUNCIADO: Sobre a raquianestesia, qual alternativa esta CORRETA?
@ALTERNATIVA_A: O nivel sensitivo maximo e atingido em 5 minutos com bupivacaina hiperbarica
@ALTERNATIVA_B: A posicao do paciente nao influencia o nivel do bloqueio
@ALTERNATIVA_C: A bupivacaina hiperbarica tende a se espalhar para regios dependentes da gravidade
@ALTERNATIVA_D: A dose tipica de bupivacaina 0.5% e de 1 ml
@GABARITO: C
@RESPOSTA_COMENTADA: A bupivacaina hiperbarica, por ser mais densa que o liquor, distribui-se para as regioes mais baixas de acordo com a posicao do paciente.
@FONTE: Barash Clinical Anesthesia, 8th Edition
```

### 1.2 Questao Discursiva

**Diretivas obrigatorias:**
| Diretiva | Descricao |
|---|---|
| `@TIPO` | `discursiva` |
| `@ENUNCIADO` | Texto da questao (minimo 5 caracteres) |

**Diretivas opcionais:**
| Diretiva | Descricao |
|---|---|
| `@RESPOSTA_COMENTADA` | Resposta esperada/modelo |
| `@FONTE` | Referencia bibliografica |
| `@IMAGEM_URL` | URL de uma imagem |
| `@VIDEO_URL` | URL de video |
| `@PONTUACAO` | Valor da questao (padrao: 1) |

**Exemplo:**

```
@TIPO: discursiva
@ENUNCIADO: Descreva o mecanismo de acao dos bloqueadores neuromusculares despolarizantes, incluindo as fases de bloqueio e as diferencas clinicas entre o bloqueio Fase I e Fase II.
@RESPOSTA_COMENTADA: Os bloqueadores despolarizantes (succinilcolina) agem mimetizando a acetilcolina na juncao neuromuscular. Na Fase I, ocorre despolarizacao sustentada da placa motora, com fasciculacoes seguidas de paralisia. Na Fase II, com doses repetidas ou infusao prolongada, o bloqueio assume caracteristicas de um bloqueio nao-despolarizante.
@FONTE: Stoelting's Pharmacology, 6th Edition
```

### 1.3 Exemplo Misto (Multipla + Discursiva)

```
@TIPO: multipla
@ENUNCIADO: Qual e o principal efeito colateral do propofol?
@ALTERNATIVA_A: Hipertensao
@ALTERNATIVA_B: Hipotensao
@ALTERNATIVA_C: Taquicardia
@ALTERNATIVA_D: Broncoespasmo
@GABARITO: B
@RESPOSTA_COMENTADA: O propofol causa vasodilatacao e depressao miocardica, resultando em hipotensao dose-dependente.
---
@TIPO: discursiva
@ENUNCIADO: Compare os perfis farmacologicos do propofol e do etomidato, destacando suas indicacoes preferenciais e contraindicacoes.
@RESPOSTA_COMENTADA: O propofol e preferido para induccao e manutencao em pacientes hemodinamicamente estaveis. O etomidato e reservado para pacientes instveis pela sua estabilidade cardiovascular, porem causa supressao adrenal.
---
@TIPO: multipla
@ENUNCIADO: A succinilcolina e contraindicada em:
@ALTERNATIVA_A: Pacientes com miastenia gravis
@ALTERNATIVA_B: Pacientes com hipercalemia conhecida
@ALTERNATIVA_C: Pacientes com historia de hipertermia maligna
@ALTERNATIVA_D: Todas as alternativas acima
@GABARITO: D
```

---

## 2. Prova de Video

Para avaliacoes do tipo `prova-video`, cada questao inclui dados adicionais de configuracao do video.

### Diretivas Adicionais (obrigatorias para prova-video)

| Diretiva | Descricao |
|---|---|
| `@VIDEO_ID` | ID do video no YouTube (ex: `dQw4w9WgXcQ`) |
| `@TIMESTAMP_PARADA` | Momento de parada em segundos (ex: `120` para 2min) |
| `@TEMPO_RESPOSTA` | Tempo permitido para responder em segundos (ex: `60`) |

### Exemplo Completo

```
@TIPO: multipla
@ENUNCIADO: No video apresentado, qual tecnica anestesica esta sendo demonstrada?
@ALTERNATIVA_A: Bloqueio interescalenico
@ALTERNATIVA_B: Bloqueio supraclavicular
@ALTERNATIVA_C: Bloqueio infraclavicular
@ALTERNATIVA_D: Bloqueio axilar
@ALTERNATIVA_E: Bloqueio do nervo femoral
@GABARITO: B
@RESPOSTA_COMENTADA: O video demonstra a realizacao de um bloqueio supraclavicular guiado por ultrassom, com visualizacao do plexo braquial na regiao supraclavicular.
@FONTE: Hadzic's Textbook of Regional Anesthesia, 2nd Edition
@VIDEO_ID: abc123xyz
@TIMESTAMP_PARADA: 145
@TEMPO_RESPOSTA: 90
---
@TIPO: multipla
@ENUNCIADO: Qual estrutura anatomica serve como referencia principal no procedimento demonstrado?
@ALTERNATIVA_A: Arteria subclavia
@ALTERNATIVA_B: Primeira costela
@ALTERNATIVA_C: Musculo escaleno anterior
@ALTERNATIVA_D: Veia jugular interna
@GABARITO: A
@VIDEO_ID: abc123xyz
@TIMESTAMP_PARADA: 280
@TEMPO_RESPOSTA: 60
---
@TIPO: discursiva
@ENUNCIADO: Descreva as complicacoes possiveis do procedimento demonstrado no video e as medidas preventivas para cada uma.
@VIDEO_ID: abc123xyz
@TIMESTAMP_PARADA: 400
@TEMPO_RESPOSTA: 180
```

---

## 3. Simulado Evolutivo

O simulado evolutivo usa um formato completamente diferente, com questoes que se conectam em arvore de decisao e alternativas que impactam o estado do paciente.

### 3.0 Dados do Paciente (bloco opcional)

O **primeiro bloco** do arquivo pode conter os dados iniciais do paciente. Se presente, ele sera detectado automaticamente e preenchera a secao "Dados do Paciente" no formulario de criacao.

**Diretivas do paciente:**
| Diretiva | Descricao |
|---|---|
| `@PACIENTE_NOME` | Nome do paciente (**obrigatorio** se o bloco for incluido) |
| `@PACIENTE_IDADE` | Idade em anos (ex: `55`) |
| `@PACIENTE_SEXO` | `M` (masculino) ou `F` (feminino) |
| `@PACIENTE_QUEIXA` | Queixa principal |
| `@PACIENTE_HISTORICO` | Historico clinico relevante |
| `@PACIENTE_MEDICACOES` | Medicacoes em uso |
| `@PACIENTE_FC` | Frequencia cardiaca em bpm (ex: `110`) |
| `@PACIENTE_PA` | Pressao arterial (ex: `140/90`) |
| `@PACIENTE_SPO2` | Saturacao de oxigenio em % (ex: `95`) |
| `@PACIENTE_FR` | Frequencia respiratoria em irpm (ex: `20`) |
| `@PACIENTE_TEMP` | Temperatura em °C (ex: `36.8`) |
| `@PACIENTE_ECG_ST` | Desvio do segmento ST em mV (ex: `0`, `2`) |
| `@PACIENTE_ECG_STATUS` | Status do ECG (ex: `Normal`, `Alterado`) |
| `@PACIENTE_STATUS` | Status geral do paciente (`Estavel` ou `Instavel`) |

> **Importante:** O bloco do paciente deve ser o **primeiro bloco** do arquivo, antes das questoes. Ele e separado das questoes pela mesma marca `---`.

**Exemplo de bloco de paciente:**

```
@PACIENTE_NOME: Carlos Eduardo Santos
@PACIENTE_IDADE: 58
@PACIENTE_SEXO: M
@PACIENTE_QUEIXA: Dor toracica intensa ha 3 horas, irradiando para membro superior esquerdo
@PACIENTE_HISTORICO: Hipertensao arterial, dislipidemia, tabagismo (30 macos/ano), sedentarismo
@PACIENTE_MEDICACOES: Losartana 50mg 12/12h, Sinvastatina 20mg/dia, AAS 100mg/dia
@PACIENTE_FC: 105
@PACIENTE_PA: 160/95
@PACIENTE_SPO2: 93
@PACIENTE_FR: 22
@PACIENTE_TEMP: 36.4
@PACIENTE_ECG_ST: 0
@PACIENTE_ECG_STATUS: Normal
@PACIENTE_STATUS: Instavel
---
@QUESTAO_ID_REF: q1
@ENUNCIADO: Qual sua conduta inicial?
...
```

### Estrutura de uma Questao Evolutiva

**Diretivas obrigatorias:**
| Diretiva | Descricao |
|---|---|
| `@QUESTAO_ID_REF` | ID interno unico da questao (ex: `q1`, `q2`, `inicio`) |
| `@ENUNCIADO` | Texto da questao / cenario clinico |

**Diretivas opcionais:**
| Diretiva | Descricao |
|---|---|
| `@CONTEXTO_CLINICO` | Atualizacao do caso clinico exibida antes da questao |
| `@IS_FINAL` | `true` ou `false` (indica se e a ultima questao do caminho) |
| `@IMAGEM_URL` | URL de imagem |
| `@VIDEO_URL` | URL de video |
| `@PONTUACAO` | Valor base da questao |

### Estrutura de uma Alternativa Evolutiva

Cada alternativa e delimitada por `@ALT_EVOLUTIVA_INICIO` e `@ALT_EVOLUTIVA_FIM`.

**Diretivas da alternativa:**
| Diretiva | Descricao |
|---|---|
| `@ID` | ID unico da alternativa (ex: `alt1`, `a1q1`) |
| `@TEXTO` | Texto da alternativa / conduta |
| `@TIPO_RESPOSTA` | `Mais Correto` ou `Menos Correto` |
| `@VALOR` | Pontuacao (0 a 100) |
| `@PROXIMA_QUESTAO` | `questaoIdRef` da proxima questao (ou vazio se final) |
| `@RETROALIMENTACAO` | Feedback exibido apos responder |
| `@IMPACTO_FC` | Variacao na frequencia cardiaca (ex: `+10`, `-5`) |
| `@IMPACTO_PA` | Nova pressao arterial (ex: `130/85`) |
| `@IMPACTO_SPO2` | Variacao na SpO2 (ex: `-3`, `+2`) |
| `@IMPACTO_FR` | Variacao na frequencia respiratoria (ex: `+4`, `-2`) |
| `@IMPACTO_TEMP` | Variacao na temperatura (ex: `+0.5`, `-0.3`) |
| `@IMPACTO_ECG_ST` | Desvio do segmento ST em mm (ex: `0`, `2`, `-1`) |
| `@IMPACTO_ECG_STATUS` | Status do ECG (`Normal`, `Supra ST`, `Infra ST`, `Taquicardia Sinusal`, `Fibrilacao Atrial`, `Alterado`) |
| `@IMPACTO_STATUS` | Novo status do paciente (`Estavel`, `Instavel`, `Critico`, `Grave`, `Melhorando`, `Piorando`) |

### Exemplo Completo de Simulado Evolutivo

```
@PACIENTE_NOME: Antonio Ferreira
@PACIENTE_IDADE: 45
@PACIENTE_SEXO: M
@PACIENTE_QUEIXA: Dor toracica intensa ha 2 horas, irradiando para braco esquerdo, acompanhada de sudorese e nausea
@PACIENTE_HISTORICO: Hipertensao arterial, tabagismo
@PACIENTE_MEDICACOES: Enalapril 10mg/dia
@PACIENTE_FC: 110
@PACIENTE_PA: 90/60
@PACIENTE_SPO2: 94
@PACIENTE_FR: 24
@PACIENTE_TEMP: 36.2
@PACIENTE_ECG_ST: 0
@PACIENTE_ECG_STATUS: Pendente
@PACIENTE_STATUS: Instavel
---
@QUESTAO_ID_REF: q1
@ENUNCIADO: Voce recebe um paciente masculino, 45 anos, com queixa de dor toracica intensa ha 2 horas, irradiando para o braco esquerdo, acompanhada de sudorese e nausea. Sinais vitais: FC 110 bpm, PA 90/60 mmHg, SpO2 94%. Qual sua conduta inicial?
@CONTEXTO_CLINICO: Paciente admitido na emergencia com quadro sugestivo de sindrome coronariana aguda.
@IS_FINAL: false

@ALT_EVOLUTIVA_INICIO
@ID: q1_alt1
@TEXTO: Solicitar ECG de 12 derivacoes imediatamente, obter acesso venoso periferico e administrar AAS 300mg VO
@TIPO_RESPOSTA: Mais Correto
@VALOR: 100
@PROXIMA_QUESTAO: q2
@RETROALIMENTACAO: Conduta adequada. O ECG e prioritario para diagnostico, o acesso venoso permite intervencoes e o AAS e a primeira medicacao do protocolo SCA.
@IMPACTO_FC: -5
@IMPACTO_STATUS: Estavel
@ALT_EVOLUTIVA_FIM

@ALT_EVOLUTIVA_INICIO
@ID: q1_alt2
@TEXTO: Administrar morfina IV para alivio da dor e solicitar radiografia de torax
@TIPO_RESPOSTA: Menos Correto
@VALOR: 40
@PROXIMA_QUESTAO: q2
@RETROALIMENTACAO: A morfina pode ser utilizada para alivio da dor, porem o ECG deve ser a prioridade. A radiografia nao e o exame de primeira escolha para SCA.
@IMPACTO_FC: +5
@IMPACTO_PA: 85/55
@IMPACTO_STATUS: Instavel
@ALT_EVOLUTIVA_FIM

@ALT_EVOLUTIVA_INICIO
@ID: q1_alt3
@TEXTO: Solicitar enzimas cardiacas e aguardar resultado antes de qualquer intervencao
@TIPO_RESPOSTA: Menos Correto
@VALOR: 15
@PROXIMA_QUESTAO: q3
@RETROALIMENTACAO: Aguardar resultado de enzimas sem intervencao imediata pode resultar em perda de tempo critico. O ECG e as medidas iniciais sao prioritarias.
@IMPACTO_FC: +15
@IMPACTO_SPO2: -2
@IMPACTO_STATUS: Instavel
@ALT_EVOLUTIVA_FIM
---
@QUESTAO_ID_REF: q2
@ENUNCIADO: O ECG mostra supradesnivelamento de ST em D2, D3 e aVF, sugestivo de IAM inferior. Qual o proximo passo?
@CONTEXTO_CLINICO: ECG realizado confirma IAM com supra de ST em parede inferior.
@IS_FINAL: false

@ALT_EVOLUTIVA_INICIO
@ID: q2_alt1
@TEXTO: Acionar o protocolo de hemodinamica para angioplastia primaria e administrar heparina + clopidogrel
@TIPO_RESPOSTA: Mais Correto
@VALOR: 100
@PROXIMA_QUESTAO: q4
@RETROALIMENTACAO: Angioplastia primaria e o tratamento de escolha para IAMCSST quando disponivel em tempo habil. Dupla antiagregacao e anticoagulacao fazem parte do protocolo.
@IMPACTO_FC: -10
@IMPACTO_PA: 100/65
@IMPACTO_SPO2: +2
@IMPACTO_STATUS: Estavel
@ALT_EVOLUTIVA_FIM

@ALT_EVOLUTIVA_INICIO
@ID: q2_alt2
@TEXTO: Iniciar trombolitico (tenecteplase) e transferir para UTI coronariana
@TIPO_RESPOSTA: Menos Correto
@VALOR: 60
@PROXIMA_QUESTAO: q4
@RETROALIMENTACAO: A trombólise e alternativa quando a angioplastia nao esta disponivel em ate 120 minutos. Se a sala de hemodinamica esta disponivel, a angioplastia e preferencial.
@IMPACTO_FC: -5
@ALT_EVOLUTIVA_FIM
---
@QUESTAO_ID_REF: q3
@ENUNCIADO: Enquanto aguarda os resultados das enzimas, o paciente evolui com piora hemodinamica. PA 75/45 mmHg, FC 130 bpm, SpO2 89%. Qual sua conduta?
@CONTEXTO_CLINICO: Paciente em deterioracao clinica. Enzimas ainda nao disponiveis.
@IS_FINAL: false

@ALT_EVOLUTIVA_INICIO
@ID: q3_alt1
@TEXTO: Realizar ECG imediatamente, iniciar reposicao volemica cautelosa e preparar para possivel intervencao coronariana de emergencia
@TIPO_RESPOSTA: Mais Correto
@VALOR: 80
@PROXIMA_QUESTAO: q4
@RETROALIMENTACAO: Mesmo tardiamente, o ECG e fundamental. Reposicao volemica cautelosa e indicada no choque cardiogenico, evitando sobrecarga.
@IMPACTO_FC: -15
@IMPACTO_PA: 85/55
@IMPACTO_SPO2: +4
@IMPACTO_STATUS: Instavel
@ALT_EVOLUTIVA_FIM

@ALT_EVOLUTIVA_INICIO
@ID: q3_alt2
@TEXTO: Administrar noradrenalina em bomba de infusao e solicitar ecocardiograma beira-leito
@TIPO_RESPOSTA: Menos Correto
@VALOR: 50
@PROXIMA_QUESTAO: q4
@RETROALIMENTACAO: O vasopressor pode ser necessario, mas sem diagnostico eletrocardiografico estabelecido, a conduta esta incompleta.
@IMPACTO_FC: -5
@IMPACTO_PA: 90/60
@ALT_EVOLUTIVA_FIM
---
@QUESTAO_ID_REF: q4
@ENUNCIADO: Apos as intervencoes, o paciente esta estabilizado na UTI coronariana. Qual medida e essencial para a prevencao secundaria?
@CONTEXTO_CLINICO: Paciente pos-intervencao coronariana, estabilizado hemodinamicamente.
@IS_FINAL: true

@ALT_EVOLUTIVA_INICIO
@ID: q4_alt1
@TEXTO: Prescrever dupla antiagregacao (AAS + clopidogrel), betabloqueador, IECA e estatina em alta dose
@TIPO_RESPOSTA: Mais Correto
@VALOR: 100
@RETROALIMENTACAO: A prevencao secundaria pos-IAM inclui obrigatoriamente dupla antiagregacao, betabloqueador, IECA/BRA e estatina de alta potencia, conforme diretrizes atuais.
@IMPACTO_STATUS: Estavel
@ALT_EVOLUTIVA_FIM

@ALT_EVOLUTIVA_INICIO
@ID: q4_alt2
@TEXTO: Prescrever apenas AAS e orientar acompanhamento ambulatorial
@TIPO_RESPOSTA: Menos Correto
@VALOR: 25
@RETROALIMENTACAO: AAS isolado e insuficiente para prevencao secundaria pos-IAM. A omissao de betabloqueador, IECA e estatina aumenta o risco de novos eventos.
@ALT_EVOLUTIVA_FIM
```

---

## Resumo de Diretivas por Tipo

### Questao Padrao (pre-teste, pos-teste, prova, simulacao)

```
@TIPO: multipla | discursiva
@ENUNCIADO: (texto)
@ALTERNATIVA_A: (texto)
@ALTERNATIVA_B: (texto)
@ALTERNATIVA_C: (texto)        [opcional]
@ALTERNATIVA_D: (texto)        [opcional]
@ALTERNATIVA_E: (texto)        [opcional]
@GABARITO: A|B|C|D|E           [obrigatorio para multipla]
@RESPOSTA_COMENTADA: (texto)   [opcional]
@FONTE: (texto)                [opcional]
@IMAGEM_URL: (url)             [opcional]
@VIDEO_URL: (url)              [opcional]
@PONTUACAO: (numero)           [opcional, padrao: 1]
```

### Prova de Video

```
(mesmas diretivas do padrao, MAIS:)
@VIDEO_ID: (id do youtube)     [obrigatorio]
@TIMESTAMP_PARADA: (segundos)  [obrigatorio]
@TEMPO_RESPOSTA: (segundos)    [obrigatorio]
```

### Simulado Evolutivo — Dados do Paciente (primeiro bloco, opcional)

```
@PACIENTE_NOME: (texto)        [obrigatorio se bloco presente]
@PACIENTE_IDADE: (numero)      [opcional, padrao: 0]
@PACIENTE_SEXO: M|F            [opcional, padrao: M]
@PACIENTE_QUEIXA: (texto)      [opcional]
@PACIENTE_HISTORICO: (texto)   [opcional]
@PACIENTE_MEDICACOES: (texto)  [opcional]
@PACIENTE_FC: (bpm)            [opcional, padrao: 80]
@PACIENTE_PA: (ex: 120/80)     [opcional, padrao: 120/80]
@PACIENTE_SPO2: (%)            [opcional, padrao: 98]
@PACIENTE_FR: (irpm)           [opcional, padrao: 16]
@PACIENTE_TEMP: (°C)           [opcional, padrao: 36.5]
@PACIENTE_ECG_ST: (mV)         [opcional, padrao: 0]
@PACIENTE_ECG_STATUS: (texto)  [opcional, padrao: Normal]
@PACIENTE_STATUS: Estavel|Instavel  [opcional, padrao: Estavel]
```

### Simulado Evolutivo — Questoes

```
@QUESTAO_ID_REF: (id unico)   [obrigatorio]
@ENUNCIADO: (texto)            [obrigatorio]
@CONTEXTO_CLINICO: (texto)     [opcional]
@IS_FINAL: true|false          [opcional, padrao: false]
@IMAGEM_URL: (url)             [opcional]
@VIDEO_URL: (url)              [opcional]
@PONTUACAO: (numero)           [opcional, padrao: 1]

@ALT_EVOLUTIVA_INICIO
@ID: (id unico)                [obrigatorio]
@TEXTO: (texto da conduta)     [obrigatorio]
@TIPO_RESPOSTA: Mais Correto | Menos Correto  [obrigatorio]
@VALOR: 0-100                  [obrigatorio]
@PROXIMA_QUESTAO: (id ref)     [opcional - vazio se final]
@RETROALIMENTACAO: (texto)     [opcional]
@IMPACTO_FC: (±numero)         [opcional]
@IMPACTO_PA: (ex: 130/85)      [opcional]
@IMPACTO_SPO2: (±numero)      [opcional]
@IMPACTO_FR: (±numero)        [opcional]
@IMPACTO_TEMP: (±numero)      [opcional]
@IMPACTO_ECG_ST: (mm)          [opcional]
@IMPACTO_ECG_STATUS: (texto)   [opcional]
@IMPACTO_STATUS: Estavel|Instavel|Critico|Grave|Melhorando|Piorando  [opcional]
@ALT_EVOLUTIVA_FIM
```

---

## Dicas Importantes

1. **Separador entre questoes:** Use `---` em uma linha isolada. Nao coloque `---` dentro do texto de uma questao.
2. **Caracteres especiais:** Acentos e caracteres especiais sao suportados (use UTF-8).
3. **Multiplas linhas:** O enunciado e outros campos de texto podem ter multiplas linhas. Basta continuar escrevendo ate a proxima diretiva `@`.
4. **Ordem de importacao:** As questoes importadas sao adicionadas ao final da avaliacao existente, na ordem em que aparecem no arquivo.
5. **Validacao:** Use o botao "Validar e Pre-visualizar" antes de importar para verificar erros.
6. **Questoes existentes:** A importacao NAO substitui questoes existentes - apenas adiciona novas ao final.
7. **Limite:** Nao ha limite de questoes por arquivo, mas arquivos muito grandes podem ser lentos para processar.
