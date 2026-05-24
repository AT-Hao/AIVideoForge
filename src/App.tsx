import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { HomePage } from '@/pages/HomePage';
import { UploadPage } from '@/pages/UploadPage';
import { ParsePage } from '@/pages/ParsePage';
import { StylesPage } from '@/pages/StylesPage';
import { EditorPage } from '@/pages/EditorPage';
import { PreviewPage } from '@/pages/PreviewPage';
import { TasksPage } from '@/pages/TasksPage';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/parse" element={<ParsePage />} />
          <Route path="/styles" element={<StylesPage />} />
          <Route path="/editor" element={<EditorPage />} />
          <Route path="/preview" element={<PreviewPage />} />
          <Route path="/tasks" element={<TasksPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
