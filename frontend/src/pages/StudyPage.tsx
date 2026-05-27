import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext.js';
import { useAuth } from '../context/AuthContext.js';
import { ChatProvider, useChat } from '../context/ChatContext.js';
import { useChatSession } from '../hooks/useChatSession.js';
import { getDocuments, getDocumentChunks } from '../services/documentApi.js';
import { ChatMessageList } from '../components/chat/ChatMessageList.js';
import { ChatInput } from '../components/chat/ChatInput.js';
import type { ISubject, IDocument, IChunk } from '../types/index.js';

const studyAssistData: Record<number, {
  takeaways: { concept: string; desc: string; icon: string; color: string }[];
  flashcards: { question: string; answer: string }[];
}> = {
  1: {
    takeaways: [
      { concept: 'Mô hình hóa (Modeling)', desc: 'Tạo bản vẽ trừu tượng biểu diễn cấu trúc & hành vi hệ thống để định hướng lập trình.', icon: 'schema', color: 'var(--color-primary)' },
      { concept: 'UML (Unified Language)', desc: 'Ngôn ngữ chuẩn hóa quốc tế giúp các bên liên quan dễ dàng trao đổi thiết kế thiết thực.', icon: 'settings_ethernet', color: 'var(--color-secondary)' },
      { concept: 'Quản lý độ phức tạp', desc: 'Ẩn bớt các chi tiết cài đặt vụn vặt để lập trình viên tập trung vào kiến trúc hệ thống cốt lõi.', icon: 'grid_view', color: '#7b1fa2' }
    ],
    flashcards: [
      { question: 'Mục đích chính của mô hình hóa phần mềm là gì?', answer: 'Quản lý độ phức tạp của hệ thống lớn, đồng thời tạo ra tiếng nói chung thống nhất giữa giảng viên, khách hàng và đội ngũ phát triển.' },
      { question: 'UML là viết tắt của cụm từ tiếng Anh nào?', answer: 'Unified Modeling Language — Ngôn ngữ Mô hình hóa Thống nhất.' }
    ]
  },
  2: {
    takeaways: [
      { concept: 'Sơ đồ Use Case', desc: 'Mô tả trực quan các chức năng hệ thống từ góc nhìn thực tế của tác nhân ngoài (Actor).', icon: 'account_circle', color: 'var(--color-primary)' },
      { concept: 'Mối quan hệ <<include>>', desc: 'Hành vi bắt buộc phải diễn ra; Use Case gốc không thể hoàn thành nếu không gọi include.', icon: 'input', color: 'var(--color-secondary)' },
      { concept: 'Mối quan hệ <<extend>>', desc: 'Hành vi tùy chọn/mở rộng; chỉ xảy ra khi thỏa mãn một điều kiện nghiệp vụ cụ thể.', icon: 'call_split', color: '#c2185b' }
    ],
    flashcards: [
      { question: 'Phân biệt sự khác biệt cơ bản giữa <<include>> và <<extend>>?', answer: '<<include>> mô tả hành vi bắt buộc phải thực hiện trong khi <<extend>> mô tả hành vi mở rộng tùy chọn, chỉ kích hoạt khi thỏa mãn điều kiện nhất định.' },
      { question: 'Tác nhân (Actor) trong sơ đồ có bắt buộc là con người không?', answer: 'Không, Actor có thể là bất kỳ thực thể bên ngoài nào tương tác với hệ thống, ví dụ: Hệ thống thanh toán ngân hàng, phần cứng cảm biến, hay DB ngoài.' }
    ]
  },
  3: {
    takeaways: [
      { concept: 'Class Diagram (Sơ đồ lớp)', desc: 'Biểu diễn cấu trúc tĩnh của hệ thống gồm các lớp, thuộc tính, phương thức và quan hệ giữa chúng.', icon: 'data_object', color: 'var(--color-primary)' },
      { concept: 'Sequence Diagram (Tuần tự)', desc: 'Biểu diễn tương tác động giữa các đối tượng theo trình tự thời gian cụ thể của một kịch bản.', icon: 'hourglass_empty', color: 'var(--color-secondary)' },
      { concept: 'Composition (Cấu thành)', desc: 'Quan hệ sở hữu mạnh mẽ; nếu đối tượng cha bị hủy thì đối tượng con cấu thành cũng bị hủy theo.', icon: 'widgets', color: '#e65100' }
    ],
    flashcards: [
      { question: 'Sơ đồ nào mô tả chi tiết khía cạnh tương tác động theo thời gian của hệ thống?', answer: 'Sequence Diagram (Sơ đồ tuần tự). Nó chỉ rõ cách các đối tượng gửi nhận thông điệp theo trình tự thời gian từ trên xuống.' },
      { question: 'Sự khác nhau giữa quan hệ Composition và Aggregation?', answer: 'Composition biểu diễn quan hệ sở hữu sinh tử gắn liền (cha chết con chết), còn Aggregation biểu diễn quan hệ thu gom độc lập (cha chết con vẫn độc lập tồn tại).' }
    ]
  },
  4: {
    takeaways: [
      { concept: 'Hexagonal Architecture', desc: 'Kiến trúc lục giác phân rã nghiệp vụ cốt lõi (Core Domain) độc lập hoàn toàn với công nghệ phụ trợ bên ngoài.', icon: 'hexagon', color: 'var(--color-primary)' },
      { concept: 'Ports (Cổng giao tiếp)', desc: 'Các Interface mô tả hành vi nghiệp vụ biên, gồm Inbound (Driving) và Outbound (Driven) Ports.', icon: 'settings_input_component', color: 'var(--color-secondary)' },
      { concept: 'Adapters (Bộ điều hợp)', desc: 'Lớp triển khai kỹ thuật cụ thể cho Ports (ví dụ: REST Controller, JPA Repository, MongoDB Adapter).', icon: 'power', color: '#2e7d32' }
    ],
    flashcards: [
      { question: 'Mục đích tối cao của kiến trúc Hexagonal (Ports & Adapters) là gì?', answer: 'Giữ cho logic nghiệp vụ trung tâm sạch sẽ, không bị ô nhiễm bởi frameworks hay DB cụ thể, giúp kiểm thử tự động (Unit Test) cực kỳ dễ dàng.' },
      { question: 'Sự khác nhau giữa Driving Adapters và Driven Adapters?', answer: 'Driving Adapters (như REST Controller) kích hoạt/gọi luồng nghiệp vụ của app, còn Driven Adapters (như SQL DB Adapter) được app gọi để lưu trữ dữ liệu.' }
    ]
  },
  5: {
    takeaways: [
      { concept: 'Single Responsibility (SRP)', desc: 'Mỗi lớp chỉ nên đảm nhận một vai trò duy nhất và chỉ có duy nhất một lý do để chỉnh sửa.', icon: 'filter_1', color: 'var(--color-primary)' },
      { concept: 'Open-Closed Principle (OCP)', desc: 'Thiết kế dễ dàng mở rộng tính năng mới bằng cách kế thừa/đa hình, hạn chế sửa trực tiếp code cũ.', icon: 'lock_open', color: 'var(--color-secondary)' },
      { concept: 'Dependency Inversion (DIP)', desc: 'Mô-đun cấp cao không phụ thuộc chi tiết cấp thấp; cả hai đều phụ thuộc vào lớp trừu tượng (Interface).', icon: 'swap_vert', color: '#1565c0' }
    ],
    flashcards: [
      { question: 'Nguyên lý thay thế Liskov (LSP) yêu cầu điều gì?', answer: 'Lớp con phải có khả năng thay thế hoàn toàn cho lớp cha mà không làm phá vỡ tính đúng đắn của chương trình hoặc gây ra các ngoại lệ không mong muốn.' },
      { question: 'Nguyên lý Phân tách Giao diện (ISP) khuyên chúng ta điều gì?', answer: 'Nên chia nhỏ các interface cồng kềnh thành nhiều interface nhỏ chuyên biệt, tránh bắt ép client phụ thuộc vào các phương thức mà họ không dùng đến.' }
    ]
  }
};

const generateRichHTML = (chapter: number, chapterTitle: string, chunks: IChunk[]): string => {
  // Check if it is a seeded high-fidelity course chapter (1 to 5)
  if ([1, 2, 3, 4, 5].includes(chapter)) {
    const contentHtml = chunks.map((chunk, idx) => {
      if (chapter === 1) {
        if (idx === 0) {
          return `<h2>1. Khái niệm cơ bản về Mô hình hóa Phần mềm</h2>
<p><strong>Mô hình hóa phần mềm (Software Modeling)</strong> là một hướng tiếp cận có tính kỷ luật trong kỹ thuật phần mềm, tập trung vào việc tạo ra các bản vẽ trừu tượng biểu diễn cấu trúc tĩnh và hành vi động của một hệ thống. Một mô hình phần mềm đóng vai trò là một <em>bản thiết kế cốt lõi (blueprint)</em> cho phép các nhà phát triển, quản lý dự án và khách hàng thống nhất về các tính năng, tương tác và ràng buộc của hệ thống trước khi bắt tay vào viết những dòng mã nguồn đầu tiên.</p>
<blockquote>Bằng cách sử dụng mô hình hóa trực quan, đội ngũ phát triển có thể loại bỏ hoàn toàn sự mơ hồ ngay từ giai đoạn đầu của vòng đời phát triển phần mềm (SDLC) và giảm thiểu tối đa chi phí sửa lỗi sau này.</blockquote>`;
        }
        if (idx === 1) {
          return `<h2>2. Tầm quan trọng của việc Quản lý Độ phức tạp</h2>
<p>Mục tiêu cốt lõi của mô hình hóa phần mềm là <strong>quản lý độ phức tạp</strong> của các hệ thống doanh nghiệp hiện đại. Trong các dự án quy mô lớn, việc một cá nhân có thể hiểu và ghi nhớ toàn bộ mã nguồn cùng một lúc là điều hoàn toàn bất khả thi. Các mô hình trừu tượng trực quan, đặc biệt là khi sử dụng <em>Ngôn ngữ Mô hình hóa Thống nhất (UML)</em>, giúp làm nổi bật các thành phần kiến trúc cấp cao và ẩn đi các chi tiết cài đặt vụn vặt kỹ thuật. Sự trừu tượng hóa có hệ thống này đảm bảo tính toàn vẹn của kiến trúc hệ thống luôn được kiểm chứng và tuân thủ các tiêu chuẩn thiết kế đã đặt ra.</p>`;
        }
      }

      if (chapter === 2) {
        if (idx === 0) {
          return `<h2>1. Sơ đồ Use Case và Thu nhập Yêu cầu</h2>
<p><strong>Sơ đồ Use Case (Use Case Diagram)</strong> là một kỹ thuật mô hình hóa chức năng cơ bản được sử dụng để thu thập các yêu cầu nghiệp vụ của hệ thống từ góc nhìn thực tế của người dùng bên ngoài. Một sơ đồ Use Case thể hiện một chuỗi tương tác tĩnh và động giữa các tác nhân (Actor — có thể là con người, hệ thống khác hoặc cơ sở dữ liệu ngoài) và hệ thống đang phát triển. Sơ đồ này chỉ rõ <em>hệ thống làm cái gì (what)</em> mà không đi sâu vào chi tiết kỹ thuật mã nguồn hay cấu trúc dữ liệu bên trong.</p>`;
        }
        if (idx === 1) {
          return `<h2>2. Mối quan hệ Include và Extend trong Use Case</h2>
<p>Trong thiết kế Use Case, hai mối quan hệ <strong>&lt;&lt;include&gt;&gt;</strong> và <strong>&lt;&lt;extend&gt;&gt;</strong> đóng vai trò định nghĩa các ràng buộc nghiệp vụ vô cùng cụ thể:</p>
<ul>
  <li><strong>Mối quan hệ &lt;&lt;include&gt;&gt; (Bắt buộc):</strong> Biểu diễn một hành vi chung được chia sẻ giữa nhiều Use Case. Use Case gốc <em>không thể hoàn thành</em> nếu không thực hiện Use Case được include (Ví dụ: Thanh toán đơn hàng bắt buộc phải gọi Xác thực tài khoản).</li>
  <li><strong>Mối quan hệ &lt;&lt;extend&gt;&gt; (Mở rộng tùy chọn):</strong> Biểu diễn hành vi tùy chọn hoặc có điều kiện, chỉ kích hoạt khi thỏa mãn một quy tắc nghiệp vụ nhất định (Ví dụ: Nhận mã giảm giá khi thanh toán). Use Case gốc vẫn hoàn toàn độc lập và hoạt động bình thường nếu hành vi extend không xảy ra.</li>
</ul>`;
        }
      }

      if (chapter === 3) {
        if (idx === 0) {
          return `<h2>1. Sơ đồ Lớp (Class Diagram) - Cấu trúc tĩnh</h2>
<p><strong>Sơ đồ lớp (Class Diagram)</strong> là sơ đồ quan trọng nhất trong lập trình hướng đối tượng, mô tả cấu trúc tĩnh của hệ thống bằng cách hiển thị các lớp, thuộc tính, phương thức và các mối quan hệ tĩnh giữa chúng như Association (Hiệp tác), Aggregation (Thu gom), Composition (Cấu thành) và Generalization (Kế thừa). Sơ đồ lớp giúp các kỹ sư xây dựng mô hình dữ liệu quan hệ và định hình khung mã nguồn hướng đối tượng.</p>
<blockquote>Quan hệ <strong>Composition (Cấu thành)</strong> biểu diễn liên kết sinh tử chặt chẽ: nếu đối tượng cha bị hủy, các đối tượng con cấu thành bên trong cũng sẽ bị tiêu hủy theo. Ngược lại, <strong>Aggregation (Thu gom)</strong> biểu diễn liên kết yếu hơn, các đối tượng con vẫn độc lập tồn tại khi đối tượng cha bị hủy.</blockquote>`;
        }
        if (idx === 1) {
          return `<h2>2. Sơ đồ Tuần tự (Sequence Diagram) - Khía cạnh động</h2>
<p>Để trực quan hóa các khía cạnh động của hệ thống theo dòng thời gian, các kỹ sư sử dụng <strong>Sơ đồ tuần tự (Sequence Diagram)</strong>. Đây là sơ đồ biểu diễn các tương tác giữa các đối tượng theo thứ tự thời gian cụ thể của một kịch bản sử dụng (use case scenario). Sơ đồ chỉ rõ các đối tượng nào tham gia vào tương tác, các thông điệp (method calls) được trao đổi, thời gian sống của đối tượng và giá trị trả về.</p>`;
        }
      }

      if (chapter === 4) {
        if (idx === 0) {
          return `<h2>1. Tổng quan về Kiến trúc Lục giác (Hexagonal Architecture)</h2>
<p><strong>Kiến trúc Lục giác (Hexagonal Architecture)</strong>, hay còn gọi là mẫu thiết kế <strong>Ports and Adapters</strong>, là một kiến trúc phần mềm hiện đại nhằm tách biệt logic nghiệp vụ trung tâm (Core Domain) khỏi tất cả các yếu tố công nghệ, hạ tầng bên ngoài như UI frameworks, cơ sở dữ liệu, và dịch vụ mạng của bên thứ ba. Nhờ sự tách biệt này, ứng dụng trở nên linh hoạt, dễ bảo trì và có thể thay đổi các nhà cung cấp dịch vụ hạ tầng mà không cần chỉnh sửa bất kỳ dòng code nghiệp vụ cốt lõi nào.</p>`;
        }
        if (idx === 1) {
          return `<h2>2. Vai trò của Ports và Adapters</h2>
<p>Kiến trúc này hoạt động dựa trên sự phối hợp giữa hai thành phần chính:</p>
<ul>
  <li><strong>Ports (Cổng kết nối):</strong> Là các Interface trừu tượng định nghĩa các hành vi nghiệp vụ biên. Gồm <em>Driving Ports (Inbound)</em> mô tả các dịch vụ mà ứng dụng cung cấp ra bên ngoài, và <em>Driven Ports (Outbound)</em> mô tả các dịch vụ mà ứng dụng cần gọi từ bên ngoài (như lưu trữ DB).</li>
  <li><strong>Adapters (Bộ điều hợp):</strong> Là các lớp triển khai kỹ thuật cụ thể cho Ports. Ví dụ: REST Controller đóng vai trò là một Driving Adapter gọi Inbound Port, còn MongoDB Repository Adapter đóng vai trò là một Driven Adapter triển khai Outbound Port để ghi dữ liệu xuống cơ sở dữ liệu.</li>
</ul>`;
        }
      }

      if (chapter === 5) {
        if (idx === 0) {
          return `<h2>1. Nguyên lý SRP, OCP và LSP trong Thiết kế</h2>
<p><strong>SOLID</strong> là 5 nguyên lý thiết kế hướng đối tượng nền tảng giúp hệ thống phần mềm trở nên dễ đọc, dễ kiểm thử và dễ mở rộng rộng rãi:</p>
<ol>
  <li><strong>Single Responsibility Principle (SRP - Đơn nhiệm):</strong> Một lớp chỉ nên đảm nhận duy nhất một nhiệm vụ/trách nhiệm và chỉ có một lý do duy nhất để thay đổi.</li>
  <li><strong>Open-Closed Principle (OCP - Đóng mở):</strong> Các thành phần phần mềm nên mở rộng cho việc phát triển tính năng mới (extension) nhưng đóng lại đối với việc sửa đổi mã nguồn cũ đã chạy ổn định (modification).</li>
  <li><strong>Liskov Substitution Principle (LSP - Thay thế Liskov):</strong> Các đối tượng của lớp con phải có khả năng thay thế hoàn toàn cho đối tượng của lớp cha mà không làm thay đổi tính đúng đắn của chương trình.</li>
</ol>`;
      }
      if (idx === 1) {
        return `<h2>2. Nguyên lý ISP và DIP</h2>
<p>Hai nguyên lý cuối cùng giúp giải quyết triệt để sự phụ thuộc chéo và kết hợp lỏng (loose coupling):</p>
<ul>
  <li><strong>Interface Segregation Principle (ISP - Phân tách giao diện):</strong> Nên chia nhỏ các interface cồng kềnh thành nhiều interface nhỏ chuyên biệt, tránh bắt ép client phụ thuộc vào các phương thức mà họ không dùng đến.</li>
  <li><strong>Dependency Inversion Principle (DIP - Đảo ngược phụ thuộc):</strong> Các mô-đun cấp cao không nên phụ thuộc trực tiếp vào chi tiết cấp thấp; cả hai đều phải phụ thuộc vào lớp trừu tượng (Interface).</li>
</ul>`;
      }
    }

    // Default fallback (seeded data chunks)
    return `<h2>Đoạn kiến thức #${chunk.chunkIndex + 1}</h2>
<p>${chunk.content}</p>`;
  }).join('\n');

  return `
    <div class="editor-title-container">
      <h1 class="editor-doc-h1">Chương ${chapter}: ${chapterTitle}</h1>
      <p class="editor-doc-meta">Tài liệu học tập chính thức • Môn học: Software Modeling and Design</p>
      <hr class="editor-doc-divider" />
    </div>
    <div class="editor-doc-content-body">
      ${contentHtml}
    </div>
  `;
}

  // Otherwise (for uploaded word/powerpoint files), display them continuously without chunk boundaries!
  const contentHtml = chunks
    .map((chunk) => {
      return chunk.content
        .split('\n')
        .filter((p) => p.trim() !== '')
        .map((p) => `<p style="margin-bottom: 16px; text-indent: 24px; text-align: justify; line-height: 1.8;">${p}</p>`)
        .join('\n');
    })
    .join('\n');

  return `
    <div class="editor-title-container">
      <h1 class="editor-doc-h1">${chapterTitle}</h1>
      <p class="editor-doc-meta">Tài liệu môn học • Trích xuất tự động</p>
      <hr class="editor-doc-divider" />
    </div>
    <div class="editor-doc-content-body">
      ${contentHtml}
    </div>
  `;
};

const loadScript = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
};

const StudyPageInner: React.FC = () => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const { state: appState } = useApp();
  const { state: authState } = useAuth();
  const { dispatch: chatDispatch } = useChat();

  const {
    activeSessionId,
    messages,
    isLoading: isChatLoading,
    error: chatError,
    loadSessionDetails,
    postMessage,
    startNewSession,
  } = useChatSession();

  // Core Study Page State
  const [subject, setSubject] = useState<ISubject | null>(null);
  const [documents, setDocuments] = useState<IDocument[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);

  // Selected Document & Chunks State
  const [selectedDoc, setSelectedDoc] = useState<IDocument | null>(null);
  const [chunks, setChunks] = useState<IChunk[]>([]);
  const [isLoadingChunks, setIsLoadingChunks] = useState(false);

  // AI Study Assist & Reading Modes
  const [viewMode, setViewMode] = useState<'reading' | 'assist'>('reading');
  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({});
  const [editorContent, setEditorContent] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [hasPhysicalFile, setHasPhysicalFile] = useState<boolean>(false);
  const [showPdfPreview, setShowPdfPreview] = useState<boolean>(true);
  const [assistData, setAssistData] = useState<{
    takeaways: { concept: string; desc: string; icon: string; color: string }[];
    flashcards: { question: string; answer: string }[];
  } | null>(null);
  const [isGeneratingAssist, setIsGeneratingAssist] = useState<boolean>(false);
  const [assistError, setAssistError] = useState<string | null>(null);

  // Layout Layout Sidebar state
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [chatWidth, setChatWidth] = useState(400); // Resizable right sidebar default
  const [isResizing, setIsResizing] = useState(false);

  const dividerRef = useRef<HTMLDivElement>(null);
  const chatPaneRef = useRef<HTMLDivElement>(null);

  // Fetch subject info & files for this subject
  useEffect(() => {
    const activeSub = appState.subjects.find((s) => s._id === subjectId) as ISubject;
    if (activeSub) {
      setSubject(activeSub);
      // Double check enrollment for students
      if (
        authState.user?.role === 'student' &&
        !authState.user.enrolledSubjects.includes(subjectId!)
      ) {
        navigate('/portal', { replace: true });
        return;
      }
    } else if (appState.subjects.length > 0) {
      // Only redirect if subjects list is loaded and this ID doesn't exist
      navigate('/portal', { replace: true });
      return;
    }

    // Load documents for this subject
    const loadDocs = async () => {
      setIsLoadingDocs(true);
      try {
        const docs = await getDocuments({ subject: activeSub.name, status: 'indexed' });
        setDocuments(docs.sort((a, b) => a.chapter - b.chapter));
        // Auto-select first document if available
        if (docs.length > 0) {
          void selectDocument(docs[0] as IDocument);
        }
      } catch (err) {
        console.error('Failed to load course documents:', err);
      } finally {
        setIsLoadingDocs(false);
      }
    };

    void loadDocs();
  }, [subjectId, appState.subjects]);

  // Load chat session: Auto start a new session for this course if no session selected
  useEffect(() => {
    const initChat = async () => {
      chatDispatch({ type: 'CLEAR_CHAT' });
      try {
        await startNewSession(subjectId, `Hỏi đáp ${subject?.name || 'Môn học'}`);
      } catch (err) {
        console.error('Failed to initialize session:', err);
      }
    };
    if (subjectId) {
      void initChat();
    }
  }, [subjectId, subject]);

  const selectDocument = async (doc: IDocument) => {
    setSelectedDoc(doc);
    setIsLoadingChunks(true);
    setChunks([]);
    setViewMode('reading');
    setFlippedCards({});
    setIsEditing(false);
    setHasPhysicalFile(false);
    setShowPdfPreview(false);
    setAssistData(null);
    setAssistError(null);
    try {
      const data = await getDocumentChunks(doc._id);
      setChunks(data);
      const richHTML = generateRichHTML(doc.chapter, doc.chapterTitle, data);
      setEditorContent(richHTML);

      // Check if physical file exists on the server
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/documents/${doc._id}/file`, {
        method: 'HEAD',
        headers: {
          'Authorization': `Bearer ${token || ''}`
        }
      });
      if (response.ok) {
        setHasPhysicalFile(true);
        if (doc.fileType === 'pdf') {
          setShowPdfPreview(true);
        } else {
          setShowPdfPreview(false);
          if (doc.fileType === 'docx') {
            try {
              await loadScript('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.8.0/mammoth.browser.min.js');
              const fileResponse = await fetch(`/api/documents/${doc._id}/file?token=${token || ''}`);
              const arrayBuffer = await fileResponse.arrayBuffer();
              const result = await (window as any).mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
              const docxHTML = `
                <div class="editor-title-container">
                  <h1 class="editor-doc-h1">${doc.chapterTitle}</h1>
                  <p class="editor-doc-meta">Tài liệu Word gốc (.docx) • Được kết xuất nguyên bản</p>
                  <hr class="editor-doc-divider" />
                </div>
                <div class="editor-doc-content-body docx-rendered-content">
                  ${result.value}
                </div>
              `;
              setEditorContent(docxHTML);
            } catch (docxErr) {
              console.error('Failed to parse docx with mammoth, falling back to chunks:', docxErr);
            }
          }
        }
      }

      // Try fetching cached DocumentAssist data
      const assistResponse = await fetch(`/api/documents/${doc._id}/assist`, {
        headers: {
          'Authorization': `Bearer ${token || ''}`
        }
      });
      if (assistResponse.ok) {
        const assistJson = await assistResponse.json();
        if (assistJson.success && assistJson.cached && assistJson.data) {
          setAssistData(assistJson.data);
        }
      }
    } catch (err) {
      console.error('Failed to load document text chunks:', err);
    } finally {
      setIsLoadingChunks(false);
    }
  };

  const handleGenerateAssist = async () => {
    if (!selectedDoc) return;
    setIsGeneratingAssist(true);
    setAssistError(null);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/documents/${selectedDoc._id}/assist/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token || ''}`,
          'Content-Type': 'application/json'
        }
      });
      const resJson = await response.json();
      if (response.ok && resJson.success && resJson.data) {
        setAssistData(resJson.data);
      } else {
        setAssistError(resJson.error || 'Không thể tạo bản tóm tắt học tập. Vui lòng thử lại sau.');
      }
    } catch (err) {
      console.error('Failed to generate AI study guides:', err);
      setAssistError('Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại mạng.');
    } finally {
      setIsGeneratingAssist(false);
    }
  };

  // Chat message send handler
  const handleSend = async (text: string) => {
    try {
      await postMessage(text, subjectId);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  // Dragging logic for resizable chatbot sidebar
  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const resize = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 280 && newWidth <= 650) {
        setChatWidth(newWidth);
      }
    },
    [isResizing]
  );

  const stopResize = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResize);
    } else {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResize);
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResize);
    };
  }, [isResizing, resize, stopResize]);

  return (
    <div className="study-workspace">
      {/* ── 1. LEFT SIDEBAR: Table of Contents / Document List ── */}
      <aside className={`study-left-pane ${leftSidebarOpen ? 'open' : 'collapsed'}`}>
        <div className="pane-header flex-center">
          <span className="material-symbols-outlined header-icon">menu_book</span>
          <span className="pane-title">Nội dung học tập</span>
          <button
            className="toggle-pane-btn flex-center"
            onClick={() => setLeftSidebarOpen(false)}
            title="Đóng mục lục"
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
        </div>

        <div className="pane-body">
          <div className="subject-meta">
            <h3 className="subject-name">{subject?.name}</h3>
            <p className="subject-desc">{subject?.description}</p>
          </div>

          <div className="chapters-outline">
            <p className="outline-label">DANH SÁCH CHƯƠNG</p>
            {isLoadingDocs ? (
              <div className="flex-center" style={{ padding: '24px 0' }}>
                <span className="spinner spinner-sm" />
              </div>
            ) : documents.length === 0 ? (
              <p className="outline-empty">Chưa có tài liệu ôn tập nào được tải lên cho môn này.</p>
            ) : (
              <div className="chapter-list">
                {documents.map((doc) => (
                  <button
                    key={doc._id}
                    className={`chapter-item ${selectedDoc?._id === doc._id ? 'active' : ''}`}
                    onClick={() => selectDocument(doc)}
                  >
                    <span className="material-symbols-outlined chapter-icon">
                      {doc.fileType === 'pdf' ? 'picture_as_pdf' : 'description'}
                    </span>
                    <div className="chapter-info">
                      <p className="chapter-num">Chương {doc.chapter}</p>
                      <p className="chapter-title">{doc.chapterTitle}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Button to reopen left outline when collapsed */}
      {!leftSidebarOpen && (
        <button
          className="reopen-left-btn flex-center"
          onClick={() => setLeftSidebarOpen(true)}
          title="Mở mục lục"
        >
          <span className="material-symbols-outlined">menu_book</span>
          <span className="material-symbols-outlined chevron">chevron_right</span>
        </button>
      )}

      {/* Button to reopen right assistant when collapsed */}
      {!rightSidebarOpen && (
        <button
          className="reopen-right-btn flex-center"
          onClick={() => setRightSidebarOpen(true)}
          title="Mở trợ lý AI"
        >
          <span className="material-symbols-outlined">psychology</span>
          <span className="material-symbols-outlined chevron">chevron_left</span>
        </button>
      )}

      <main className="study-center-pane">
        {selectedDoc ? (
          <div className="document-reader">
            {/* Header with Dual Mode Tabs */}
            <div className="reader-header">
              <div className="reader-doc-details">
                <span className="badge badge-success">Chương {selectedDoc.chapter}</span>
                <h2 className="doc-title">{selectedDoc.chapterTitle}</h2>
                <p className="doc-meta">
                  Nguồn: <strong>{selectedDoc.originalName}</strong> • {selectedDoc.totalChunks} đoạn kiến thức
                </p>
              </div>
              <div className="reader-header-tabs flex-center">
                <button
                  className={`tab-btn ${viewMode === 'reading' ? 'active' : ''}`}
                  onClick={() => setViewMode('reading')}
                  title="Chế độ đọc liên tục"
                >
                  <span className="material-symbols-outlined">menu_book</span>
                  Đọc tài liệu
                </button>
                <button
                  className={`tab-btn ${viewMode === 'assist' ? 'active' : ''}`}
                  onClick={() => setViewMode('assist')}
                  title="AI Hỗ trợ học tập trực quan"
                >
                  <span className="material-symbols-outlined">psychology_alt</span>
                  AI Study Assist
                </button>
              </div>
            </div>

            <div className="reader-body" style={{ padding: viewMode === 'reading' ? '0' : '32px' }}>
              {isLoadingChunks ? (
                <div className="flex-center" style={{ height: '200px' }}>
                  <span className="spinner" />
                </div>
              ) : chunks.length === 0 ? (
                <div className="flex-center" style={{ height: '200px', flexDirection: 'column', gap: 12 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--color-outline)' }}>error</span>
                  <p style={{ color: 'var(--color-outline)' }}>Không thể tải văn bản. Tài liệu có thể rỗng.</p>
                </div>
              ) : viewMode === 'reading' ? (
                /* ── Mode 1: Google Docs / CKEditor Clone Workspace ── */
                <div className="google-docs-editor-container">
                  {/* WYSIWYG Editor Toolbar */}
                  <div className="editor-toolbar glass">
                    <div className="toolbar-group">
                      <select 
                        className="toolbar-select" 
                        defaultValue="normal" 
                        title="Định dạng đoạn văn"
                        disabled={!isEditing}
                      >
                        <option value="h1">Tiêu đề 1</option>
                        <option value="h2">Tiêu đề 2</option>
                        <option value="normal">Văn bản thường</option>
                      </select>
                      <select 
                        className="toolbar-select font-size-select" 
                        defaultValue="16" 
                        title="Kích thước chữ"
                        disabled={!isEditing}
                      >
                        <option value="14">14px</option>
                        <option value="16">16px</option>
                        <option value="18">18px</option>
                        <option value="20">20px</option>
                      </select>
                    </div>

                    <div className="toolbar-divider" />

                    <div className="toolbar-group">
                      <button className="toolbar-btn bold-btn active" title="In đậm (Ctrl+B)">B</button>
                      <button className="toolbar-btn italic-btn" title="In nghiêng (Ctrl+I)">I</button>
                      <button className="toolbar-btn underline-btn" title="Gạch chân (Ctrl+U)">U</button>
                      <button className="toolbar-btn color-btn" title="Màu chữ">
                        <span className="material-symbols-outlined">format_color_text</span>
                      </button>
                    </div>

                    <div className="toolbar-divider" />

                    <div className="toolbar-group">
                      <button className="toolbar-btn" title="Căn lề trái"><span className="material-symbols-outlined">format_align_left</span></button>
                      <button className="toolbar-btn" title="Căn giữa"><span className="material-symbols-outlined">format_align_center</span></button>
                      <button className="toolbar-btn" title="Căn lề phải"><span className="material-symbols-outlined">format_align_right</span></button>
                      <button className="toolbar-btn" title="Căn đều"><span className="material-symbols-outlined">format_align_justify</span></button>
                    </div>

                    <div className="toolbar-divider" />

                    <div className="toolbar-group">
                      <button className="toolbar-btn" title="Danh sách ký hiệu"><span className="material-symbols-outlined">format_list_bulleted</span></button>
                      <button className="toolbar-btn" title="Danh sách số"><span className="material-symbols-outlined">format_list_numbered</span></button>
                    </div>

                    <div className="toolbar-divider" />

                    <div className="toolbar-group" style={{ marginLeft: 'auto', gap: 8 }}>
                      {hasPhysicalFile && (
                        <a 
                          href={`/api/documents/${selectedDoc._id}/file?token=${localStorage.getItem('auth_token') || ''}`}
                          download={selectedDoc.originalName}
                          className="editor-mode-toggle btn-ghost"
                          title="Tải xuống tệp tài liệu gốc"
                          style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>download</span>
                          Tải tệp gốc
                        </a>
                      )}
                      {hasPhysicalFile && selectedDoc.fileType === 'pdf' && (
                        <button 
                          className={`editor-mode-toggle btn-ghost ${showPdfPreview ? 'pdf-active' : ''}`}
                          onClick={() => {
                            setShowPdfPreview(!showPdfPreview);
                            setIsEditing(false);
                          }}
                          title={showPdfPreview ? 'Chuyển sang định dạng văn bản để chỉnh sửa' : 'Chuyển sang xem PDF gốc'}
                        >
                          <span className="material-symbols-outlined">
                            {showPdfPreview ? 'edit_note' : 'picture_as_pdf'}
                          </span>
                          {showPdfPreview ? 'Soạn thảo' : 'Xem PDF'}
                        </button>
                      )}
                      <button 
                        className={`editor-mode-toggle btn-ghost ${isEditing ? 'editing' : ''}`}
                        onClick={() => {
                          setIsEditing(!isEditing);
                          if (!isEditing) {
                            setShowPdfPreview(false);
                          }
                        }}
                        title={isEditing ? 'Chuyển sang chế độ đọc' : 'Chuyển sang chế độ chỉnh sửa'}
                      >
                        <span className="material-symbols-outlined">
                          {isEditing ? 'menu_book' : 'edit'}
                        </span>
                        {isEditing ? 'Đọc Sách' : 'Chỉnh sửa'}
                      </button>
                      <button 
                        className="toolbar-btn print-btn" 
                        onClick={() => window.print()} 
                        title="In tài liệu"
                      >
                        <span className="material-symbols-outlined">print</span>
                      </button>
                    </div>
                  </div>

                  {/* Office Document Banner (for docx/pptx files) */}
                  {hasPhysicalFile && selectedDoc.fileType !== 'pdf' && (
                    <div className="office-doc-banner glass">
                      <span className="material-symbols-outlined banner-icon">info</span>
                      <div className="banner-content">
                        <p className="banner-text" style={{ margin: 0 }}>
                          <strong>Tài liệu Word gốc ({selectedDoc.fileType.toUpperCase()})</strong> đã được trích xuất dữ liệu thành công. Bạn có thể chỉnh sửa trực tiếp bên dưới hoặc tải xuống tệp gốc nguyên bản.
                        </p>
                      </div>
                      <a 
                        href={`/api/documents/${selectedDoc._id}/file?token=${localStorage.getItem('auth_token') || ''}`}
                        download={selectedDoc.originalName}
                        className="banner-download-btn flex-center"
                        title="Tải xuống tệp tài liệu gốc"
                        style={{ textDecoration: 'none' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>download</span>
                        Tải tệp gốc
                      </a>
                    </div>
                  )}

                  {/* Margin Ruler */}
                  {!showPdfPreview && (
                    <div className="editor-ruler-container">
                      <div className="editor-ruler">
                        <div className="ruler-margin left-margin" />
                        <div className="ruler-ticks">
                          {Array.from({ length: 18 }).map((_, idx) => (
                            <div key={idx} className="ruler-tick">
                              <span>{idx + 1}</span>
                            </div>
                          ))}
                        </div>
                        <div className="ruler-margin right-margin" />
                      </div>
                    </div>
                  )}

                  {/* Word Paper Document or PDF Viewer */}
                  {showPdfPreview ? (
                    <div className="pdf-viewer-container">
                      <iframe
                        src={`/api/documents/${selectedDoc._id}/file?token=${localStorage.getItem('auth_token') || ''}`}
                        className="pdf-iframe"
                        title={selectedDoc.originalName}
                      />
                    </div>
                  ) : (
                    <div className="editor-paper-container">
                      <div 
                        className={`editor-paper glass ${isEditing ? 'content-editable' : ''}`}
                        contentEditable={isEditing}
                        suppressContentEditableWarning
                        onBlur={(e) => setEditorContent(e.currentTarget.innerHTML)}
                        dangerouslySetInnerHTML={{ __html: editorContent }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                /* ── Mode 2: AI Study Assistant (Bento grid + 3D Flashcards) ── */
                (() => {
                  const currentAssistData = assistData || (selectedDoc && [1, 2, 3, 4, 5].includes(selectedDoc.chapter) ? studyAssistData[selectedDoc.chapter] : null);

                  if (isGeneratingAssist) {
                    return (
                      <div className="assist-generating-skeleton">
                        <div className="skeleton-header">
                          <span className="material-symbols-outlined auto-awesome-spin">auto_awesome</span>
                          <h3>Gemini đang quét tài liệu và đúc kết kiến thức...</h3>
                          <p>Quá trình này có thể mất từ 5-10 giây để đảm bảo độ chính xác và chất lượng cao nhất.</p>
                        </div>
                        <div className="skeleton-bento-grid">
                          <div className="skeleton-card glass loading-shimmer">
                            <div className="laser-scanner" />
                            <div className="skeleton-icon" />
                            <div className="skeleton-line title" />
                            <div className="skeleton-line body-1" />
                            <div className="skeleton-line body-2" />
                          </div>
                          <div className="skeleton-card glass loading-shimmer">
                            <div className="laser-scanner" />
                            <div className="skeleton-icon" />
                            <div className="skeleton-line title" />
                            <div className="skeleton-line body-1" />
                            <div className="skeleton-line body-2" />
                          </div>
                          <div className="skeleton-card glass loading-shimmer">
                            <div className="laser-scanner" />
                            <div className="skeleton-icon" />
                            <div className="skeleton-line title" />
                            <div className="skeleton-line body-1" />
                            <div className="skeleton-line body-2" />
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (!currentAssistData) {
                    return (
                      <div className="assist-placeholder-screen glass">
                        <div className="placeholder-icon-wrap">
                          <span className="material-symbols-outlined brain-pulse">psychology</span>
                        </div>
                        <h3>Trí tuệ nhân tạo Gemini sẵn sàng hỗ trợ bạn</h3>
                        <p>Phân tích và tóm tắt toàn bộ tệp tài liệu để đúc kết các khái niệm cốt lõi (Bento Grid) và tự động thiết kế thẻ nhớ ghi nhớ 3D thông minh chỉ trong một nút nhấn!</p>
                        {assistError && (
                          <div className="assist-error-banner">
                            <span className="material-symbols-outlined">warning</span>
                            <p>{assistError}</p>
                          </div>
                        )}
                        <button onClick={handleGenerateAssist} className="generate-assist-btn">
                          <span className="material-symbols-outlined">auto_awesome</span>
                          Tạo Tóm Tắt & Thẻ Nhớ
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="study-assist-view">
                      {/* Takeaways Section */}
                      <div className="assist-section">
                        <div className="section-header-title">
                          <span className="material-symbols-outlined">insights</span>
                          <h3>Khái niệm Cốt lõi (Key Takeaways)</h3>
                        </div>
                        <div className="takeaways-grid">
                          {currentAssistData.takeaways.map((takeaway, idx) => (
                            <div key={idx} className="takeaway-card glass">
                              <div className="takeaway-icon-wrap" style={{ backgroundColor: takeaway.color || 'var(--color-primary)' }}>
                                <span className="material-symbols-outlined">{takeaway.icon || 'star'}</span>
                              </div>
                              <h4 className="takeaway-concept">{takeaway.concept}</h4>
                              <p className="takeaway-desc">{takeaway.desc}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Flashcards Section */}
                      <div className="assist-section">
                        <div className="section-header-title">
                          <span className="material-symbols-outlined">style</span>
                          <h3>Thẻ nhớ thông minh (Interactive Flashcards)</h3>
                        </div>
                        <div className="flashcards-grid">
                          {currentAssistData.flashcards.map((card, idx) => {
                            const isFlipped = !!flippedCards[idx];
                            return (
                              <div
                                key={idx}
                                className={`flashcard-wrapper ${isFlipped ? 'flipped' : ''}`}
                                onClick={() => setFlippedCards(prev => ({ ...prev, [idx]: !prev[idx] }))}
                              >
                                <div className="flashcard-inner">
                                  {/* Front of card */}
                                  <div className="card-front glass">
                                    <span className="card-label">Câu hỏi #{idx + 1}</span>
                                    <p className="card-question">{card.question}</p>
                                    <span className="flip-hint">
                                      <span className="material-symbols-outlined">3d_rotation</span>
                                      Click để lật thẻ
                                    </span>
                                  </div>
                                  {/* Back of card */}
                                  <div className="card-back">
                                    <p className="card-answer">{card.answer}</p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        ) : (
          <div className="reader-intro flex-center">
            <div className="intro-content">
              <span className="material-symbols-outlined intro-icon">auto_stories</span>
              <h2>Không gian Học tập môn {subject?.name}</h2>
              <p>Chọn một bài giảng hoặc tài liệu ở mục lục bên trái để bắt đầu đọc sách và nghiên cứu cùng AI.</p>
            </div>
          </div>
        )}
      </main>

      {/* ── 3. DIVIDER BAR: Draggable handle for sizing chat ── */}
      {rightSidebarOpen && (
        <div
          className={`resizable-divider ${isResizing ? 'active' : ''}`}
          ref={dividerRef}
          onMouseDown={startResize}
          title="Kéo thả để thay đổi kích thước"
        >
          <div className="divider-handle" />
        </div>
      )}

      {/* ── 4. RIGHT SIDEBAR: Scoped RAG Chatbot Pane ── */}
      <aside
        className={`study-right-pane ${rightSidebarOpen ? 'open' : 'collapsed'} ${isResizing ? 'resizing' : ''}`}
        ref={chatPaneRef}
        style={{ width: rightSidebarOpen ? `${chatWidth}px` : '0px' }}
      >
        <div className="chat-header flex-center">
          <span className="material-symbols-outlined header-icon">psychology</span>
          <div className="header-meta">
            <span className="pane-title">RAG AI Assistant</span>
            <span className="chat-scope">Phạm vi: {subject?.name}</span>
          </div>
          <button
            className="toggle-pane-btn flex-center"
            onClick={() => setRightSidebarOpen(false)}
            title="Đóng trợ lý AI"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="chat-body">
          <ChatMessageList
            messages={messages}
            isLoading={isChatLoading}
            onSuggestClick={handleSend}
          />
        </div>

        <div className="chat-footer-wrapper">
          <ChatInput onSend={handleSend} disabled={isChatLoading} />
        </div>
      </aside>

      <style>{`
        .study-workspace {
          display: flex;
          height: calc(100vh - var(--header-height));
          width: 100%;
          background: var(--color-background);
          overflow: hidden;
          position: relative;
        }

        /* ── Left Sidebar ── */
        .study-left-pane {
          display: flex;
          flex-direction: column;
          border-right: 1px solid var(--color-outline-variant);
          background: var(--color-surface-container-low);
          transition: width var(--transition-base), opacity var(--transition-base);
          overflow: hidden;
          flex-shrink: 0;
        }
        .study-left-pane.open { width: 300px; opacity: 1; }
        .study-left-pane.collapsed { width: 0; opacity: 0; pointer-events: none; }

        .pane-header {
          padding: 16px 20px;
          border-bottom: 1px solid var(--color-outline-variant);
          justify-content: space-between;
          background: var(--color-surface-container-low);
        }
        .pane-header .header-icon {
          font-size: 20px;
          color: var(--color-primary);
          margin-right: 8px;
        }
        .pane-title {
          font: var(--text-label-lg);
          font-weight: 600;
          color: var(--color-on-surface);
          flex: 1;
        }
        .toggle-pane-btn {
          width: 28px;
          height: 28px;
          border-radius: var(--radius-sm);
          color: var(--color-on-surface-variant);
          transition: background var(--transition-fast);
        }
        .toggle-pane-btn:hover { background: var(--color-surface-container-high); }

        .pane-body {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .subject-meta {
          background: var(--color-surface-container-lowest);
          border: 1px solid var(--color-outline-variant);
          padding: 16px;
          border-radius: var(--radius-xl);
        }
        .subject-name { font: var(--text-title-medium); color: var(--color-primary); margin-bottom: 6px; }
        .subject-desc { font: var(--text-body-sm); color: var(--color-outline); line-height: 1.5; }

        .chapters-outline { display: flex; flex-direction: column; gap: 12px; }
        .outline-label { font: var(--text-label-sm); font-weight: 600; color: var(--color-outline); letter-spacing: 0.5px; }
        .outline-empty { font: var(--text-body-sm); color: var(--color-outline); line-height: 1.5; text-align: center; padding: 24px 0; }
        .chapter-list { display: flex; flex-direction: column; gap: 8px; }
        .chapter-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 14px;
          border-radius: var(--radius-xl);
          border: 1.5px solid transparent;
          background: var(--color-surface-container-low);
          text-align: left;
          transition: all var(--transition-fast);
        }
        .chapter-item:hover { background: var(--color-surface-container-high); }
        .chapter-item.active {
          background: var(--color-primary-fixed);
          border-color: var(--color-primary);
          color: var(--color-primary);
        }
        .chapter-item .chapter-icon { font-size: 20px; margin-top: 2px; }
        .chapter-info { display: flex; flex-direction: column; gap: 2px; }
        .chapter-num { font: var(--text-label-sm); font-weight: 600; }
        .chapter-title { font: var(--text-body-sm); line-height: 1.4; color: var(--color-on-surface); font-weight: 500; }
        .chapter-item.active .chapter-title { color: var(--color-primary); }

        /* Collapse button */
        .reopen-left-btn {
          position: absolute;
          left: 16px;
          top: 16px;
          background: var(--color-primary-fixed);
          color: var(--color-primary);
          border: 1px solid var(--color-primary);
          border-radius: var(--radius-full);
          padding: 6px 14px;
          font: var(--text-label-md);
          font-weight: 600;
          box-shadow: var(--shadow-md);
          z-index: 10;
          gap: 4px;
          transition: transform var(--transition-fast);
        }
        .reopen-left-btn:hover { transform: scale(1.05); }
        .reopen-left-btn .chevron { font-size: 16px; }

        /* ── Center Workspace ── */
        .study-center-pane {
          flex: 1;
          height: 100%;
          overflow-y: auto;
          background: var(--color-background);
          position: relative;
          min-width: 0;
        }
        .reader-intro { height: 100%; text-align: center; padding: 48px 24px; }
        .intro-content { max-width: 380px; display: flex; flex-direction: column; align-items: center; gap: 16px; }
        .intro-icon { font-size: 64px; color: var(--color-primary); }
        .intro-content h2 { font: var(--text-headline-md); color: var(--color-on-surface); }
        .intro-content p { font: var(--text-body-sm); color: var(--color-outline); line-height: 1.6; }

        .document-reader { display: flex; flex-direction: column; height: 100%; min-width: 0; }
        .reader-header {
          padding: 20px 32px;
          border-bottom: 1px solid var(--color-outline-variant);
          background: var(--color-surface-container-lowest);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }
        .reader-header-tabs {
          display: flex;
          background: var(--color-surface-container-low);
          padding: 4px;
          border-radius: var(--radius-xl);
          border: 1px solid var(--color-outline-variant);
          gap: 4px;
        }
        .tab-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          font: var(--text-label-md);
          font-weight: 600;
          color: var(--color-on-surface-variant);
          border-radius: var(--radius-lg);
          transition: all var(--transition-fast);
        }
        .tab-btn:hover {
          color: var(--color-primary);
          background: rgba(0, 35, 111, 0.05);
        }
        .tab-btn.active {
          color: var(--color-primary);
          background: var(--color-surface-container-lowest);
          box-shadow: var(--shadow-sm);
        }
        .tab-btn .material-symbols-outlined {
          font-size: 18px;
        }
        .reader-doc-details { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; }
        .doc-title { font: var(--text-headline-md); color: var(--color-on-surface); font-weight: 700; }
        .doc-meta { font: var(--text-body-sm); color: var(--color-outline); }

        .reader-body { flex: 1; overflow-y: auto; padding: 32px; }

        /* ── Google Docs / CKEditor Style Workspace ── */
        .google-docs-editor-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          gap: 16px;
          padding: 8px 16px 32px 16px;
          background: var(--color-background);
          overflow-y: auto;
          height: 100%;
          min-width: 0;
        }

        /* Editor WYSIWYG Toolbar */
        .editor-toolbar {
          width: 100%;
          max-width: 850px;
          display: flex;
          align-items: center;
          padding: 8px 16px;
          border-radius: var(--radius-2xl);
          border: 1px solid var(--color-outline-variant);
          background: var(--color-surface-container-lowest);
          box-shadow: var(--shadow-sm);
          gap: 8px;
          position: sticky;
          top: 0;
          z-index: 30;
          flex-wrap: wrap;
        }
        .toolbar-group {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .toolbar-select {
          background: var(--color-surface-container-low);
          border: 1px solid var(--color-outline-variant);
          border-radius: var(--radius-lg);
          padding: 6px 12px;
          font: var(--text-label-sm);
          font-weight: 600;
          color: var(--color-on-surface);
          outline: none;
          cursor: pointer;
        }
        .toolbar-select:hover {
          border-color: var(--color-primary);
        }
        .font-size-select {
          width: 76px;
        }
        .toolbar-btn {
          width: 32px;
          height: 32px;
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 14px;
          color: var(--color-on-surface-variant);
          transition: all var(--transition-fast);
          cursor: pointer;
        }
        .toolbar-btn:hover {
          background: var(--color-surface-container-high);
          color: var(--color-primary);
        }
        .toolbar-btn.active {
          background: var(--color-primary-fixed);
          color: var(--color-primary);
        }
        .toolbar-btn .material-symbols-outlined {
          font-size: 20px;
        }
        .toolbar-divider {
          width: 1px;
          height: 20px;
          background: var(--color-outline-variant);
          margin: 0 4px;
        }

        /* Mode Toggle */
        .editor-mode-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          font: var(--text-label-sm);
          font-weight: 700;
          border-radius: var(--radius-full);
          border: 1.5px solid var(--color-outline-variant);
          transition: all var(--transition-fast);
          background: var(--color-surface-container-lowest);
          color: var(--color-on-surface-variant);
        }
        .editor-mode-toggle:hover {
          border-color: var(--color-primary);
          color: var(--color-primary);
          background: rgba(0, 35, 111, 0.05);
        }
        .editor-mode-toggle.editing {
          background: var(--color-primary);
          color: var(--color-on-primary);
          border-color: var(--color-primary);
        }

        /* Margin Ruler */
        .editor-ruler-container {
          width: 100%;
          max-width: 850px;
          display: flex;
          justify-content: center;
          padding: 0 16px;
        }
        .editor-ruler {
          width: 100%;
          height: 24px;
          background: var(--color-surface-container-low);
          border: 1px solid var(--color-outline-variant);
          border-radius: var(--radius-lg);
          display: flex;
          position: relative;
          overflow: hidden;
          box-shadow: inset 0 1px 3px rgba(0,0,0,0.05);
        }
        .ruler-margin {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 48px;
          background: var(--color-surface-container-high);
          opacity: 0.5;
        }
        .ruler-margin.left-margin {
          left: 0;
          border-right: 1.5px solid var(--color-primary-fixed-dim);
        }
        .ruler-margin.right-margin {
          right: 0;
          border-left: 1.5px solid var(--color-primary-fixed-dim);
        }
        .ruler-ticks {
          flex: 1;
          display: flex;
          justify-content: space-around;
          padding: 0 48px;
          align-items: flex-end;
          padding-bottom: 2px;
        }
        .ruler-tick {
          height: 6px;
          border-left: 1px solid var(--color-outline);
          font-size: 8px;
          color: var(--color-outline);
          position: relative;
          width: 1px;
        }
        .ruler-tick span {
          position: absolute;
          bottom: 8px;
          left: -4px;
          font-weight: bold;
        }

        /* A4 Paper Document Sheet */
        .editor-paper-container {
          width: 100%;
          max-width: 850px;
          display: flex;
          justify-content: center;
        }
        .editor-paper {
          width: 100%;
          min-height: 900px;
          background: var(--color-surface-container-lowest);
          border: 1.5px solid var(--color-outline-variant);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-lg);
          padding: 64px 72px;
          outline: none;
          color: var(--color-on-surface);
          line-height: 1.8;
          font-family: 'Inter', sans-serif;
          font-size: 16px;
          text-align: justify;
          transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
        }
        .editor-paper.content-editable {
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px rgba(0, 35, 111, 0.12), var(--shadow-lg);
        }
        .editor-paper blockquote {
          border-left: 4px solid var(--color-primary);
          padding-left: 20px;
          margin: 20px 0;
          font-style: italic;
          color: var(--color-on-surface-variant);
        }
        .editor-paper ul, .editor-paper ol {
          margin-left: 24px;
          margin-bottom: 16px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .editor-paper li {
          line-height: 1.6;
        }
        .editor-paper h2 {
          font: var(--text-headline-md);
          font-weight: 700;
          color: var(--color-primary);
          margin-top: 32px;
          margin-bottom: 12px;
          border-bottom: 1px solid var(--color-outline-variant);
          padding-bottom: 4px;
        }
        .editor-paper table {
          width: 100%;
          border-collapse: collapse;
          margin: 24px 0;
          font-size: 14px;
        }
        .editor-paper th, .editor-paper td {
          border: 1px solid var(--color-outline-variant);
          padding: 10px 14px;
          text-align: left;
        }
        .editor-paper th {
          background: var(--color-surface-container-low);
          font-weight: 700;
          color: var(--color-primary);
        }
        .editor-title-container {
          margin-bottom: 32px;
        }
        .editor-doc-h1 {
          font: var(--text-headline-xl);
          font-size: 28px;
          font-weight: 800;
          color: var(--color-primary);
          margin-bottom: 8px;
          line-height: 1.3;
        }
        .editor-doc-meta {
          font: var(--text-body-sm);
          color: var(--color-outline);
        }
        .editor-doc-divider {
          border: none;
          border-bottom: 1.5px solid var(--color-outline-variant);
          margin: 16px 0;
        }

        /* ── AI Assist Welcome Screen & Skeleton ── */
        .assist-placeholder-screen {
          max-width: 650px;
          margin: 40px auto;
          padding: 48px 32px;
          border-radius: var(--radius-3xl);
          border: 1px solid var(--color-outline-variant);
          background: rgba(255, 255, 255, 0.45);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          box-shadow: var(--shadow-md), inset 0 1px 0 rgba(255,255,255,0.6);
        }
        .placeholder-icon-wrap {
          width: 80px;
          height: 80px;
          border-radius: var(--radius-full);
          background: var(--color-primary-fixed);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-primary);
          box-shadow: 0 8px 24px rgba(0, 35, 111, 0.15);
        }
        .placeholder-icon-wrap .brain-pulse {
          font-size: 44px;
          animation: brainPulse 2s infinite ease-in-out;
        }
        .assist-placeholder-screen h3 {
          font: var(--text-headline-md);
          font-weight: 750;
          color: var(--color-on-surface);
        }
        .assist-placeholder-screen p {
          font: var(--text-body-md);
          color: var(--color-outline);
          line-height: 1.6;
          max-width: 500px;
        }
        .assist-error-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 20px;
          background: #ffebee;
          border: 1.5px solid #ffcdd2;
          color: #c62828;
          border-radius: var(--radius-xl);
          text-align: left;
          font: var(--text-body-sm);
          font-weight: 550;
          width: 100%;
        }
        .assist-error-banner p {
          margin: 0;
          color: #c62828;
          font: var(--text-body-sm);
        }
        .generate-assist-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 28px;
          background: linear-gradient(135deg, var(--color-primary) 0%, #1a56db 100%);
          color: white;
          border: none;
          border-radius: var(--radius-full);
          font: var(--text-label-lg);
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 16px rgba(26, 86, 219, 0.3);
        }
        .generate-assist-btn:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 8px 24px rgba(26, 86, 219, 0.45);
          filter: brightness(1.1);
        }
        .generate-assist-btn:active {
          transform: translateY(0) scale(0.98);
        }
        .generate-assist-btn .material-symbols-outlined {
          font-size: 20px;
        }

        /* Generating State Skeleton */
        .assist-generating-skeleton {
          max-width: 800px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 32px;
          padding-bottom: 24px;
        }
        .skeleton-header {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
        .skeleton-header h3 {
          font: var(--text-headline-small);
          font-weight: 700;
          color: var(--color-on-surface);
        }
        .skeleton-header p {
          font: var(--text-body-md);
          color: var(--color-outline);
        }
        .auto-awesome-spin {
          font-size: 40px;
          color: var(--color-primary);
          animation: spinPulse 2.5s infinite linear;
        }
        .skeleton-bento-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 16px;
        }
        .skeleton-card {
          min-height: 160px;
          border-radius: var(--radius-2xl);
          border: 1px solid var(--color-outline-variant);
          background: rgba(255, 255, 255, 0.3);
          padding: 24px;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .skeleton-icon {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-lg);
          background: var(--color-surface-container-high);
        }
        .skeleton-line {
          height: 12px;
          background: var(--color-surface-container-high);
          border-radius: var(--radius-sm);
        }
        .skeleton-line.title {
          width: 55%;
          height: 16px;
        }
        .skeleton-line.body-1 {
          width: 90%;
        }
        .skeleton-line.body-2 {
          width: 75%;
        }

        /* Scanning animation laser and shimmer */
        .loading-shimmer::after {
          content: "";
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
          transform: translateX(-100%);
          background-image: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.4) 20%,
            rgba(255, 255, 255, 0.6) 60%,
            rgba(255, 255, 255, 0) 100%
          );
          animation: shimmer 2s infinite;
        }
        .laser-scanner {
          position: absolute;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, transparent, var(--color-primary), transparent);
          box-shadow: 0 0 8px var(--color-primary);
          animation: scanVertical 3s infinite ease-in-out;
          opacity: 0.8;
          z-index: 5;
        }
        .skeleton-card:nth-child(2) .laser-scanner {
          animation-delay: 0.5s;
        }
        .skeleton-card:nth-child(3) .laser-scanner {
          animation-delay: 1s;
        }

        @keyframes brainPulse {
          0% { transform: scale(1); filter: drop-shadow(0 0 0px var(--color-primary)); }
          50% { transform: scale(1.08); filter: drop-shadow(0 0 10px rgba(0, 35, 111, 0.3)); }
          100% { transform: scale(1); filter: drop-shadow(0 0 0px var(--color-primary)); }
        }
        @keyframes spinPulse {
          0% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(1.15); }
          100% { transform: rotate(360deg) scale(1); }
        }
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        @keyframes scanVertical {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }

        /* ── Study Assist View ── */
        .study-assist-view {
          display: flex;
          flex-direction: column;
          gap: 36px;
          max-width: 800px;
          margin: 0 auto;
          padding-bottom: 24px;
        }
        .assist-section {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .section-header-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font: var(--text-headline-md);
          color: var(--color-primary);
          font-weight: 700;
        }
        .section-header-title .material-symbols-outlined {
          font-size: 24px;
        }

        /* Takeaways Bento Grid */
        .takeaways-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 16px;
        }
        .takeaway-card {
          background: var(--color-surface-container-lowest);
          border: 1.5px solid var(--color-outline-variant);
          border-radius: var(--radius-2xl);
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          transition: all var(--transition-base);
          position: relative;
          overflow: hidden;
        }
        .takeaway-card:hover {
          transform: translateY(-3px);
          box-shadow: var(--shadow-md);
          border-color: var(--color-primary);
        }
        .takeaway-icon-wrap {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-xl);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 20px;
        }
        .takeaway-concept {
          font: var(--text-label-lg);
          font-weight: 700;
          color: var(--color-on-surface);
        }
        .takeaway-desc {
          font: var(--text-body-sm);
          color: var(--color-outline);
          line-height: 1.5;
        }

        /* 3D Flipping Flashcards */
        .flashcards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
        }
        .flashcard-wrapper {
          perspective: 1000px;
          height: 180px;
          cursor: pointer;
        }
        .flashcard-inner {
          position: relative;
          width: 100%;
          height: 100%;
          text-align: center;
          transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
          transform-style: preserve-3d;
        }
        .flashcard-wrapper.flipped .flashcard-inner {
          transform: rotateY(180deg);
        }
        .card-front, .card-back {
          position: absolute;
          width: 100%;
          height: 100%;
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
          border-radius: var(--radius-2xl);
          padding: 24px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          box-shadow: var(--shadow-sm);
          border: 1.5px solid var(--color-outline-variant);
        }
        .card-front {
          background: var(--color-surface-container-low);
          color: var(--color-on-surface);
        }
        .card-front .card-label {
          font: var(--text-label-sm);
          font-weight: 700;
          color: var(--color-primary);
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 12px;
        }
        .card-front .card-question {
          font: var(--text-body-md);
          font-weight: 600;
          line-height: 1.5;
        }
        .card-front .flip-hint {
          position: absolute;
          bottom: 12px;
          font: var(--text-label-sm);
          color: var(--color-outline);
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .card-back {
          background: var(--color-primary);
          color: white;
          transform: rotateY(180deg);
          border-color: var(--color-primary);
        }
        .card-back .card-answer {
          font: var(--text-body-sm);
          line-height: 1.6;
          text-align: center;
        }

        /* ── Divider ── */
        .resizable-divider {
          width: 8px;
          height: 100%;
          cursor: col-resize;
          background: transparent;
          position: relative;
          flex-shrink: 0;
          transition: background var(--transition-fast);
          z-index: 20;
        }
        .resizable-divider:hover, .resizable-divider.active {
          background: var(--color-primary-fixed);
        }
        .divider-handle {
          position: absolute;
          left: 3px;
          top: 50%;
          transform: translateY(-50%);
          width: 2px;
          height: 40px;
          background: var(--color-outline-variant);
          border-radius: var(--radius-full);
          transition: background var(--transition-fast);
        }
        .resizable-divider:hover .divider-handle, .resizable-divider.active .divider-handle {
          background: var(--color-primary);
        }

        /* ── Right Sidebar Chat ── */
        .study-right-pane {
          display: flex;
          flex-direction: column;
          background: var(--color-surface-container-lowest);
          border-left: 1px solid var(--color-outline-variant);
          height: 100%;
          flex-shrink: 0;
          overflow: hidden;
          transition: width var(--transition-base), opacity var(--transition-base), border-left var(--transition-base);
        }
        .study-right-pane.resizing {
          transition: none !important;
        }
        .study-right-pane.open { opacity: 1; }
        .study-right-pane.collapsed { opacity: 0; pointer-events: none; border-left: none; }

        .study-right-pane .chat-header {
          padding: 16px 20px;
          border-bottom: 1px solid var(--color-outline-variant);
          background: var(--color-surface-container-lowest);
          gap: 12px;
        }
        .study-right-pane .chat-header .header-icon {
          font-size: 24px;
          color: var(--color-primary);
        }
        .study-right-pane .header-meta { display: flex; flex-direction: column; flex: 1; }
        .study-right-pane .pane-title { font: var(--text-label-lg); font-weight: 700; color: var(--color-on-surface); }
        .chat-scope { font: var(--text-label-sm); color: var(--color-outline); }

        .study-right-pane .chat-body {
          flex: 1;
          overflow-y: auto;
          background: var(--color-surface-container-lowest);
          position: relative;
        }
        .chat-footer-wrapper {
          padding: 8px 0;
          background: transparent;
        }

        /* Reopen right button */
        .reopen-right-btn {
          position: absolute;
          right: 16px;
          top: 16px;
          background: var(--color-primary-fixed);
          color: var(--color-primary);
          border: 1px solid var(--color-primary);
          border-radius: var(--radius-full);
          padding: 6px 14px;
          font: var(--text-label-md);
          font-weight: 600;
          box-shadow: var(--shadow-md);
          z-index: 10;
          gap: 4px;
          transition: transform var(--transition-fast);
        }
        .reopen-right-btn:hover { transform: scale(1.05); }
        .reopen-right-btn .chevron { font-size: 16px; }

        /* ── PDF Viewer styles ── */
        .pdf-viewer-container {
          width: 100%;
          max-width: 850px;
          display: flex;
          justify-content: center;
          height: calc(100vh - 280px);
          min-height: 600px;
          margin-bottom: 24px;
        }
        .pdf-iframe {
          width: 100%;
          height: 100%;
          border: 1.5px solid var(--color-outline-variant);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-lg);
          background: var(--color-surface-container-lowest);
        }
        .editor-mode-toggle.pdf-active {
          background: var(--color-primary-fixed) !important;
          color: var(--color-primary) !important;
          border-color: var(--color-primary) !important;
        }

        /* ── Office Doc Banner ── */
        .office-doc-banner {
          width: 100%;
          max-width: 850px;
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 24px;
          border-radius: var(--radius-xl);
          background: rgba(0, 35, 111, 0.04);
          border: 1px solid var(--color-outline-variant);
          margin-bottom: 8px;
        }
        .office-doc-banner .banner-icon {
          font-size: 24px;
          color: var(--color-primary);
        }
        .office-doc-banner .banner-content {
          flex: 1;
        }
        .office-doc-banner .banner-text {
          font: var(--text-body-sm);
          color: var(--color-on-surface);
          line-height: 1.5;
        }
        .banner-download-btn {
          padding: 8px 16px;
          background: var(--color-primary);
          color: var(--color-on-primary);
          border-radius: var(--radius-full);
          font: var(--text-label-md);
          font-weight: 700;
          gap: 8px;
          text-decoration: none;
          transition: transform var(--transition-fast), background var(--transition-fast);
        }
        .banner-download-btn:hover {
          background: #001a54;
          transform: translateY(-1px);
        }

        /* ── Responsive Adaptations for open sidebars ── */
        @media (max-width: 1024px) {
          .reader-body {
            padding: 16px !important;
          }
          .editor-paper {
            padding: 32px 24px !important;
          }
        }
        @media (max-width: 768px) {
          .editor-ruler-container {
            display: none !important;
          }
          .editor-paper {
            padding: 24px 16px !important;
          }
        }



      `}</style>
    </div>
  );
};

export const StudyPage: React.FC = () => (
  <ChatProvider>
    <StudyPageInner />
  </ChatProvider>
);
