# Use Case Diagram - SE1939 RAG Chatbot

This diagram describes the main behavior of the SE1939 RAG Chatbot system. The project is a single-user academic demo, so the primary human actor is modeled as `User (Student / Instructor)`.

## Actors

| Actor | Description |
| --- | --- |
| User (Student / Instructor) | Uploads course documents, asks questions, manages chat sessions, and views the evaluation test set. |
| Gemini API | Generates embeddings and natural-language answers. |
| MongoDB | Stores documents, chunks, embeddings, chat sessions, messages, and citations. |

## Main Use Cases

| Group | Use Case | Description |
| --- | --- | --- |
| Document Management | Upload course material | User uploads PDF, DOCX, or PPTX materials with subject/chapter metadata. |
| Document Management | Parse document text | System extracts text from uploaded files. |
| Document Management | Split text into chunks | System divides extracted text into searchable chunks. |
| Document Management | Generate embeddings | System calls Gemini embedding model for each chunk. |
| Document Management | Store document and chunks | System stores metadata, chunks, and embeddings in MongoDB. |
| Document Management | View/Search/Delete documents | User manages indexed materials in the document vault. |
| Chat and Retrieval | Start chat session | User begins a new conversation. |
| Chat and Retrieval | Ask a question | User sends a natural-language question. |
| Chat and Retrieval | Retrieve relevant chunks | System embeds the query and runs cosine similarity search over MongoDB chunks. |
| Chat and Retrieval | Generate answer from course context | Gemini answers using retrieved context and citations. |
| Chat and Retrieval | Generate general answer | Gemini answers from general knowledge when no context is found and `ALLOW_GENERAL_QUESTIONS=true`. |
| Chat and Retrieval | Save/View/Delete chat history | System stores and manages sessions/messages in MongoDB. |
| Evaluation | View evaluation test set | User views benchmark questions from `test-set.json`. |
| Evaluation | View test statistics | System shows summary stats by chapter/category/difficulty. |
| Evaluation | Expand question details | User opens full question, ground-truth answer, keywords, and source. |

## PlantUML Source

The editable PlantUML file is here:

[`docs/use-case-diagram.puml`](./use-case-diagram.puml)

```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle
skinparam actorStyle awesome
skinparam shadowing false
skinparam usecase {
  BackgroundColor #F7FAFD
  BorderColor #727785
  ArrowColor #414754
}

actor "User\n(Student / Instructor)" as User
actor "Gemini API" as Gemini
database "MongoDB" as Mongo

rectangle "SE1939 RAG Chatbot System" {
  package "Document Management" {
    usecase "Upload course material" as UC_Upload
    usecase "Enter document metadata" as UC_Metadata
    usecase "Validate file type and size" as UC_Validate
    usecase "Parse document text" as UC_Parse
    usecase "Split text into chunks" as UC_Chunk
    usecase "Generate embeddings" as UC_Embed
    usecase "Store document and chunks" as UC_StoreDoc
    usecase "View document vault" as UC_ViewDocs
    usecase "Search / filter documents" as UC_SearchDocs
    usecase "Delete document" as UC_DeleteDoc
    usecase "Delete related chunks" as UC_DeleteChunks
  }

  package "Chat and Retrieval" {
    usecase "Start chat session" as UC_StartChat
    usecase "Ask a question" as UC_Ask
    usecase "Generate query embedding" as UC_QueryEmbed
    usecase "Retrieve relevant chunks" as UC_Retrieve
    usecase "Generate answer from course context" as UC_ContextAnswer
    usecase "Generate general answer" as UC_GeneralAnswer
    usecase "Show citations" as UC_Citations
    usecase "Save chat history" as UC_SaveChat
    usecase "View chat history" as UC_ViewChat
    usecase "Delete chat session" as UC_DeleteChat
  }

  package "Evaluation" {
    usecase "View evaluation test set" as UC_TestSet
    usecase "View test statistics" as UC_TestStats
    usecase "Expand question details" as UC_TestDetail
  }
}

User --> UC_Upload
User --> UC_ViewDocs
User --> UC_SearchDocs
User --> UC_DeleteDoc
User --> UC_StartChat
User --> UC_Ask
User --> UC_ViewChat
User --> UC_DeleteChat
User --> UC_TestSet

UC_Upload .> UC_Metadata : <<include>>
UC_Upload .> UC_Validate : <<include>>
UC_Upload .> UC_Parse : <<include>>
UC_Upload .> UC_Chunk : <<include>>
UC_Upload .> UC_Embed : <<include>>
UC_Upload .> UC_StoreDoc : <<include>>

UC_DeleteDoc .> UC_DeleteChunks : <<include>>

UC_Ask .> UC_QueryEmbed : <<include>>
UC_Ask .> UC_Retrieve : <<include>>
UC_Ask .> UC_SaveChat : <<include>>
UC_ContextAnswer .> UC_Citations : <<include>>
UC_ContextAnswer .> UC_Ask : <<extend>>
UC_GeneralAnswer .> UC_Ask : <<extend>>

UC_TestSet .> UC_TestStats : <<include>>
UC_TestSet .> UC_TestDetail : <<extend>>

Gemini --> UC_Embed
Gemini --> UC_QueryEmbed
Gemini --> UC_ContextAnswer
Gemini --> UC_GeneralAnswer

Mongo --> UC_StoreDoc
Mongo --> UC_Retrieve
Mongo --> UC_SaveChat
Mongo --> UC_ViewDocs
Mongo --> UC_ViewChat
Mongo --> UC_DeleteDoc
Mongo --> UC_DeleteChat

note right of UC_ContextAnswer
Used when retrieved chunks
match the user question.
Answer includes citations.
end note

note right of UC_GeneralAnswer
Used when ALLOW_GENERAL_QUESTIONS=true
and no relevant course context is found.
end note

@enduml
```

