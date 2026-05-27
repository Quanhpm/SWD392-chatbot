import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from '../config/environment.js';
import { SubjectModel } from '../models/Subject.js';
import { UserModel } from '../models/User.js';
import { DocumentModel } from '../models/Document.js';
import { ChunkModel } from '../models/Chunk.js';
import { GeminiEmbeddingAdapter } from '../adapters/GeminiEmbeddingAdapter.js';

const run = async () => {
  try {
    await mongoose.connect(env.mongodbUri);
    console.log('⚡ Connected to MongoDB Atlas');

    // 1. Fetch the demo teacher giangvien_demo
    const teacher = await UserModel.findOne({ username: 'giangvien_demo' }).exec();
    if (!teacher) {
      throw new Error('Teacher "giangvien_demo" not found. Please register it first.');
    }
    const teacherId = teacher._id;
    console.log(`👨‍🏫 Found teacher: giangvien_demo (ID: ${teacherId})`);

    // 2. Fetch or Create the Subject
    const subjectName = 'Software Modeling and Design';
    const hashedPassword = await bcrypt.hash('password123', env.bcryptSaltRounds);
    
    let subject = await SubjectModel.findOne({ name: subjectName }).exec();
    if (subject) {
      subject.teacherId = teacherId;
      subject.password = hashedPassword;
      subject.description = 'Software design concepts, UML diagrams, architectural patterns, and SOLID principles.';
      await subject.save();
      console.log(`📚 Updated existing Subject: "${subjectName}"`);
    } else {
      subject = await SubjectModel.create({
        name: subjectName,
        description: 'Software design concepts, UML diagrams, architectural patterns, and SOLID principles.',
        password: hashedPassword,
        teacherId,
      });
      console.log(`📚 Created new Subject: "${subjectName}"`);
    }

    // 3. Define the detailed 5 Chapters
    const chaptersData = [
      {
        chapter: 1,
        chapterTitle: 'Introduction to Software Modeling & Design',
        chunks: [
          'Software modeling is a disciplined approach to software engineering that focuses on creating abstract models of a system\'s structure and behavior. A software model serves as a vital blueprint that allows developers, project managers, and clients to align on system features, interactions, and constraints before implementing the actual codebase. By utilizing visual modeling, teams can eliminate ambiguity early in the software development lifecycle (SDLC) and reduce total development costs.',
          'The core objective of software modeling is managing the inherent complexity of modern enterprise systems. In large-scale projects, understanding the entire codebase simultaneously is virtually impossible for a single human mind. Visual abstractions, particularly using the Unified Modeling Language (UML), serve to highlight high-level components and suppress minor implementation details. This systematic abstraction guarantees that the architectural integrity is verified and design standards are adhered to.'
        ]
      },
      {
        chapter: 2,
        chapterTitle: 'Requirements Analysis & Use Case Diagrams',
        chunks: [
          'Use case modeling is a fundamental functional modeling technique used to capture system requirements from an external user\'s perspective. A use case diagram models a sequence of key interactions between actors (users, databases, or external systems) and the system under development. It specifies what functional actions the system performs without dictating the underlying database schemas or programming structures.',
          'Within use case relationships, the include and extend stereotypes serve distinct semantic purposes. The include relationship represents mandatory behavior that is shared among multiple use cases; the base use case cannot complete its workflow without executing the included sub-use-case. In contrast, the extend relationship represents optional or conditional behaviors that are triggered only under specific business rules, keeping the base use case functional on its own.'
        ]
      },
      {
        chapter: 3,
        chapterTitle: 'Structural & Behavioral Modeling with UML',
        chunks: [
          'Structural modeling in UML captures the static architecture of a software system. The primary artifact is the Class Diagram, which depicts classes, their attributes, methods, and the static relationships among them, such as association, aggregation, composition, and inheritance. Class diagrams form the structural backbone of object-oriented databases and help map code entities to relational database models.',
          'Behavioral modeling captures the dynamic interactions and state changes within a software system over time. Sequence Diagrams are the most common behavioral artifact, visualizing how objects collaborate and exchange messages in a specific chronological sequence. They map out the precise flow of events for use case execution, showing method calls, lifetimes, and return values.'
        ]
      },
      {
        chapter: 4,
        chapterTitle: 'Architectural Design Patterns',
        chunks: [
          'Architectural design patterns provide robust, reusable blueprints for organizing the highest level of software systems. Common patterns include Layered (n-tier) Architecture, Model-View-Controller (MVC), and Microservices. A highly premium and modern pattern is Hexagonal Architecture, also known as Ports and Adapters, which decouples core domain business rules from external technologies like databases, UI frameworks, and web APIs.',
          'Hexagonal Architecture uses Ports (abstract interfaces) to represent input/output boundaries of the core application. Driven adapters implement these ports to interact with databases or third-party web services, while driving adapters (like REST controllers) invoke the ports to execute business processes. This decoupling facilitates automated unit testing and allows swapping infrastructure adapters without modifying the core logic.'
        ]
      },
      {
        chapter: 5,
        chapterTitle: 'Object-Oriented Design & SOLID Principles',
        chunks: [
          'SOLID design principles are five fundamental rules of object-oriented design that promote maintainability, readability, and scalability. The Single Responsibility Principle (SRP) dictates that a class must have exactly one reason to change, meaning it should perform only one cohesive job. The Open-Closed Principle (OCP) requires that software components be open for extension but closed for modification, preventing edits to existing tested code.',
          'The remaining SOLID principles include Liskov Substitution Principle (LSP), which ensures that a subclass can replace its parent class without breaking system correctness; Interface Segregation Principle (ISP), which advocates for small, client-specific interfaces rather than bloated ones; and Dependency Inversion Principle (DIP), which states that high-level modules should depend on abstract interfaces rather than concrete details.'
        ]
      }
    ];

    // 4. Clean up old documents & chunks for this subject to prevent duplicates
    const oldDocs = await DocumentModel.find({ subject: subjectName }).exec();
    const oldDocIds = oldDocs.map(d => d._id);
    
    await ChunkModel.deleteMany({ documentId: { $in: oldDocIds } }).exec();
    await DocumentModel.deleteMany({ subject: subjectName }).exec();
    console.log('🧹 Cleaned up old documents and chunks for this course');

    // 5. Instantiate Embedding Adapter
    const embeddingAdapter = new GeminiEmbeddingAdapter();

    // 6. Index each Chapter
    for (const chData of chaptersData) {
      console.log(`\n⚙️ Processing Chapter ${chData.chapter}: "${chData.chapterTitle}"...`);
      
      // Create Document
      const fileName = `chapter_${chData.chapter}_se1939_${Date.now()}.pdf`;
      const originalName = `Chapter_${chData.chapter}_Software_Modeling.pdf`;
      
      const doc = await DocumentModel.create({
        fileName,
        originalName,
        fileType: 'pdf',
        fileSize: 10240, // Mock 10KB
        mimeType: 'application/pdf',
        subject: subjectName,
        chapter: chData.chapter,
        chapterTitle: chData.chapterTitle,
        status: 'indexed',
        totalChunks: chData.chunks.length,
        totalPages: 2,
        uploadedBy: teacherId,
        processedAt: new Date(),
        indexedAt: new Date(),
      });

      console.log(`📄 Created Document record: ${originalName}`);

      // Generate real Gemini Embeddings
      console.log(`🤖 Requesting Gemini embeddings for ${chData.chunks.length} chunks...`);
      const embeddings = await embeddingAdapter.generateEmbeddings(chData.chunks);

      // Insert Chunks
      const chunkInserts = chData.chunks.map((content, index) => {
        const wordCount = content.split(/\s+/).length;
        const charCount = content.length;
        return {
          documentId: doc._id,
          content,
          chunkIndex: index,
          pageNumbers: [index + 1],
          startChar: 0,
          endChar: charCount,
          tokenCount: Math.ceil(wordCount * 1.3), // Simple token estimate
          embedding: embeddings[index] ?? [],
          metadata: {
            subject: subjectName,
            chapter: chData.chapter,
            chapterTitle: chData.chapterTitle,
            fileName: originalName,
          },
        };
      });

      await ChunkModel.insertMany(chunkInserts);
      console.log(`✅ Chapter ${chData.chapter} chunks seeded successfully!`);
    }

    console.log('\n🌟 Seeding complete! All 5 detailed chapters successfully populated with real Gemini Embeddings!');
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  }
};

void run();
