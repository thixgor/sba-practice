import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db/mongoose';
import User from '@/lib/db/models/User';
import Curso from '@/lib/db/models/Curso';
import Avaliacao from '@/lib/db/models/Avaliacao';
import Questao from '@/lib/db/models/Questao';
import { generateProtocolId } from '@/lib/utils/protocol';

// ---------------------------------------------------------------------------
// POST /api/admin/seed - Seed initial data (only if no admin exists)
// ---------------------------------------------------------------------------

export async function POST() {
  try {
    await connectDB();

    // 1. Check if an admin user already exists
    const existingAdmin = await User.findOne({ role: 'admin' }).lean();
    if (existingAdmin) {
      return NextResponse.json(
        {
          error: 'ALREADY_SEEDED',
          message: 'Dados iniciais ja foram criados. Admin ja existe.',
        },
        { status: 409 },
      );
    }

    // 2. Create admin user
    const adminPasswordHash = await bcrypt.hash('Admin@123', 12);
    const adminUser = await User.create({
      protocolId: generateProtocolId('user'),
      name: 'Administrador SBA',
      email: 'admin@sbahq.org',
      passwordHash: adminPasswordHash,
      role: 'admin',
      isActive: true,
    });

    const adminId = adminUser._id;

    // 3. Create 3 sample courses
    const curso1 = await Curso.create({
      protocolId: generateProtocolId('curso'),
      name: 'Anestesiologia Basica',
      description: 'Curso introdutorio de anestesiologia cobrindo conceitos fundamentais de farmacologia anestesica, monitoracao e tecnicas basicas.',
      imageUrl: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=400&h=300&fit=crop',
      duracao: 40,
      isActive: true,
      createdBy: adminId,
    });

    const curso2 = await Curso.create({
      protocolId: generateProtocolId('curso'),
      name: 'Anestesia Regional',
      description: 'Curso avancado sobre tecnicas de anestesia regional, incluindo bloqueios de neuroeixo e perifericos guiados por ultrassom.',
      imageUrl: 'https://images.unsplash.com/photo-1551190822-a9ce113ac100?w=400&h=300&fit=crop',
      duracao: 60,
      isActive: true,
      createdBy: adminId,
    });

    const curso3 = await Curso.create({
      protocolId: generateProtocolId('curso'),
      name: 'Emergencias em Anestesia',
      description: 'Curso de capacitacao para manejo de emergencias no periodo perioperatorio, incluindo via aerea dificil e parada cardiaca.',
      imageUrl: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=400&h=300&fit=crop',
      duracao: 30,
      isActive: true,
      createdBy: adminId,
    });

    // 4. Create a pre-test with 5 questions for Curso 1
    const preTeste = await Avaliacao.create({
      protocolId: generateProtocolId('avaliacao'),
      name: 'Pre-Teste: Anestesiologia Basica',
      description: 'Avaliacao inicial para medir o nivel de conhecimento antes do curso.',
      tipo: 'pre-teste',
      curso: curso1._id,
      configuracao: {
        alternativasPadrao: 'ABCDE',
        feedbackImediato: false,
        feedbackFinal: true,
        tempoLimiteMinutos: 30,
        embaralharQuestoes: true,
        embaralharAlternativas: true,
        tentativasPermitidas: 1,
        acessoPublico: false,
      },
      isActive: true,
      createdBy: adminId,
    });

    // 5. Create 5 questions for the pre-test
    const questoesData = [
      {
        avaliacao: preTeste._id,
        tipo: 'multipla' as const,
        enunciado: 'Qual e o principal mecanismo de acao dos anestesicos locais?',
        alternativas: [
          { letra: 'A', texto: 'Bloqueio dos canais de sodio voltagem-dependentes' },
          { letra: 'B', texto: 'Ativacao dos receptores GABA' },
          { letra: 'C', texto: 'Inibicao da acetilcolinesterase' },
          { letra: 'D', texto: 'Bloqueio dos receptores NMDA' },
          { letra: 'E', texto: 'Ativacao dos canais de potassio' },
        ],
        gabarito: 'A',
        respostaComentada: 'Os anestesicos locais atuam bloqueando os canais de sodio voltagem-dependentes, impedindo a propagacao do impulso nervoso.',
        fonteBibliografica: 'Miller, R.D. Anesthesia. 9th ed. Elsevier, 2020.',
        ordem: 0,
        pontuacao: 1,
      },
      {
        avaliacao: preTeste._id,
        tipo: 'multipla' as const,
        enunciado: 'Qual classificacao ASA corresponde a um paciente com doenca sistemica grave que limita a atividade?',
        alternativas: [
          { letra: 'A', texto: 'ASA I' },
          { letra: 'B', texto: 'ASA II' },
          { letra: 'C', texto: 'ASA III' },
          { letra: 'D', texto: 'ASA IV' },
          { letra: 'E', texto: 'ASA V' },
        ],
        gabarito: 'C',
        respostaComentada: 'ASA III corresponde a paciente com doenca sistemica grave. ASA I e paciente saudavel, ASA II doenca leve, ASA IV doenca grave com ameaca a vida.',
        fonteBibliografica: 'ASA Physical Status Classification System. ASA, 2022.',
        ordem: 1,
        pontuacao: 1,
      },
      {
        avaliacao: preTeste._id,
        tipo: 'multipla' as const,
        enunciado: 'Qual a complicacao mais temida do bloqueio subaracnoideo (raquianestesia)?',
        alternativas: [
          { letra: 'A', texto: 'Cefaleia pos-puncao dural' },
          { letra: 'B', texto: 'Raquianestesia total' },
          { letra: 'C', texto: 'Lombalgia' },
          { letra: 'D', texto: 'Nausea e vomito' },
          { letra: 'E', texto: 'Retencao urinaria' },
        ],
        gabarito: 'B',
        respostaComentada: 'A raquianestesia total e a complicacao mais temida, podendo causar parada respiratoria e colapso cardiovascular.',
        fonteBibliografica: 'Barash, P.G. Clinical Anesthesia. 8th ed. Wolters Kluwer, 2017.',
        ordem: 2,
        pontuacao: 1,
      },
      {
        avaliacao: preTeste._id,
        tipo: 'multipla' as const,
        enunciado: 'Qual agente e considerado o padrao-ouro para inducao anestesica intravenosa?',
        alternativas: [
          { letra: 'A', texto: 'Ketamina' },
          { letra: 'B', texto: 'Etomidato' },
          { letra: 'C', texto: 'Propofol' },
          { letra: 'D', texto: 'Midazolam' },
          { letra: 'E', texto: 'Tiopental' },
        ],
        gabarito: 'C',
        respostaComentada: 'O propofol e o agente mais utilizado para inducao anestesica, com inicio rapido e recuperacao suave.',
        fonteBibliografica: 'Stoelting, R.K. Pharmacology and Physiology in Anesthetic Practice. 5th ed. 2015.',
        ordem: 3,
        pontuacao: 1,
      },
      {
        avaliacao: preTeste._id,
        tipo: 'multipla' as const,
        enunciado: 'Em relacao a capnografia, qual o valor normal da ETCO2 (CO2 expirado final)?',
        alternativas: [
          { letra: 'A', texto: '20-25 mmHg' },
          { letra: 'B', texto: '25-30 mmHg' },
          { letra: 'C', texto: '35-45 mmHg' },
          { letra: 'D', texto: '50-60 mmHg' },
          { letra: 'E', texto: '60-70 mmHg' },
        ],
        gabarito: 'C',
        respostaComentada: 'O valor normal da ETCO2 e de 35 a 45 mmHg, refletindo indiretamente a PaCO2 arterial.',
        fonteBibliografica: 'Miller, R.D. Anesthesia. 9th ed. Elsevier, 2020.',
        ordem: 4,
        pontuacao: 1,
      },
    ];

    const createdQuestoes = await Questao.insertMany(questoesData);
    const questaoIds = createdQuestoes.map((q) => q._id);

    // Update preTeste with question IDs
    await Avaliacao.findByIdAndUpdate(preTeste._id, {
      $set: { questoes: questaoIds },
    });

    // Update curso1 with avaliacao
    await Curso.findByIdAndUpdate(curso1._id, {
      $push: { avaliacoes: preTeste._id },
    });

    // 6. Create a post-test linked to the pre-test
    const posTeste = await Avaliacao.create({
      protocolId: generateProtocolId('avaliacao'),
      name: 'Pos-Teste: Anestesiologia Basica',
      description: 'Avaliacao final para medir o progresso apos a conclusao do curso.',
      tipo: 'pos-teste',
      curso: curso1._id,
      preTeste: preTeste._id,
      configuracao: {
        alternativasPadrao: 'ABCDE',
        feedbackImediato: false,
        feedbackFinal: true,
        tempoLimiteMinutos: 30,
        embaralharQuestoes: true,
        embaralharAlternativas: true,
        tentativasPermitidas: 1,
        acessoPublico: false,
      },
      isActive: true,
      createdBy: adminId,
    });

    // Update curso1 with posTeste
    await Curso.findByIdAndUpdate(curso1._id, {
      $push: { avaliacoes: posTeste._id },
    });

    // 7. Create a prova-video example
    const provaVideo = await Avaliacao.create({
      protocolId: generateProtocolId('avaliacao'),
      name: 'Prova de Video: Tecnicas de Intubacao',
      description: 'Avaliacao baseada em video demonstrativo de tecnicas de intubacao orotraqueal.',
      tipo: 'prova-video',
      curso: curso2._id,
      configuracao: {
        alternativasPadrao: 'ABCDE',
        feedbackImediato: false,
        feedbackFinal: true,
        tempoLimiteMinutos: 60,
        embaralharQuestoes: false,
        embaralharAlternativas: false,
        tentativasPermitidas: 1,
        acessoPublico: false,
      },
      isActive: true,
      createdBy: adminId,
    });

    // Update curso2 with provaVideo
    await Curso.findByIdAndUpdate(curso2._id, {
      $push: { avaliacoes: provaVideo._id },
    });

    // 8. Return summary
    return NextResponse.json(
      {
        message: 'Dados iniciais criados com sucesso.',
        data: {
          admin: {
            email: 'admin@sbahq.org',
            password: 'Admin@123',
            protocolId: adminUser.protocolId,
          },
          cursos: [
            { name: curso1.name, protocolId: curso1.protocolId },
            { name: curso2.name, protocolId: curso2.protocolId },
            { name: curso3.name, protocolId: curso3.protocolId },
          ],
          avaliacoes: {
            preTeste: { name: preTeste.name, protocolId: preTeste.protocolId, questoes: questoesData.length },
            posTeste: { name: posTeste.name, protocolId: posTeste.protocolId },
            provaVideo: { name: provaVideo.name, protocolId: provaVideo.protocolId },
          },
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('[POST /api/admin/seed] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Erro ao criar dados iniciais.' },
      { status: 500 },
    );
  }
}
