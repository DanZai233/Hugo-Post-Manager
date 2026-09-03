import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  Check,
  Folder,
  FolderArchive,
  Loader2,
  AlertCircle,
  Sparkles,
  Link2
} from 'lucide-react';
import { GitHubConfig, HugoPost } from '../types';
import { uploadStaticAsset } from '../services/githubApi';

interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: GitHubConfig;
  currentPost?: HugoPost | null;
  onInsertMarkdown: (text: string) => void;
}

export const ImageUploadModal: React.FC<ImageUploadModalProps> = ({
  isOpen,
  onClose,
  config,
  currentPost,
  onInsertMarkdown,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [targetFileName, setTargetFileName] = useState('');
  const [uploadMode, setUploadMode] = useState<'static' | 'bundle' | 'custom'>('static');
  const [customDir, setCustomDir] = useState(config.staticDir || 'static/img');
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    repoPath?: string;
    hugoPath?: string;
    downloadUrl?: string;
    error?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derive current post directory (e.g. content/post/my-article)
  const currentPostDir = React.useMemo(() => {
    if (!currentPost || !currentPost.path) return '';
    const segments = currentPost.path.split('/');
    if (segments.length > 1) {
      // Remove filename (e.g. index.md or my-article.md)
      return segments.slice(0, -1).join('/');
    }
    return '';
  }, [currentPost]);

  // Is current post a Page Bundle (ends in /index.md)
  const isPageBundle = Boolean(currentPost && currentPost.name === 'index.md' && currentPostDir);

  // Sync state whenever modal opens or config updates
  useEffect(() => {
    if (isOpen) {
      setSelectedFile(null);
      setPreviewUrl(null);
      setTargetFileName('');
      setUploadResult(null);
      setCustomDir(config.staticDir || 'static/img');
      // If the current post is a leaf bundle, bundle mode can be default or static
      setUploadMode(isPageBundle ? 'bundle' : 'static');
    }
  }, [isOpen, config.staticDir, isPageBundle]);

  if (!isOpen) return null;

  const handleFileChange = (file: File) => {
    setSelectedFile(file);
    const sanitizedName = file.name
      .replace(/\s+/g, '-')
      .replace(/[^\w\.\-\u4e00-\u9fa5]/g, '')
      .toLowerCase();
    setTargetFileName(sanitizedName);

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // Determine active target directory in the repo
  let activeTargetDir = '';
  let activeHugoPath = '';

  if (uploadMode === 'static') {
    activeTargetDir = (config.staticDir || 'static/img').replace(/^\/+|\/+$/g, '');
    // In Hugo, files in `static/xxx/foo.png` are referenced on the website as `/xxx/foo.png`
    const relativeWebPath = activeTargetDir.replace(/^static\/?/, '');
    activeHugoPath = targetFileName
      ? (relativeWebPath ? `/${relativeWebPath}/${targetFileName}` : `/${targetFileName}`)
      : `/${relativeWebPath}`;
  } else if (uploadMode === 'bundle') {
    activeTargetDir = currentPostDir.replace(/^\/+|\/+$/g, '');
    // Page Bundle local image reference
    activeHugoPath = targetFileName ? `./${targetFileName}` : './';
  } else {
    activeTargetDir = customDir.replace(/^\/+|\/+$/g, '');
    if (activeTargetDir.startsWith('static/')) {
      const relativeWebPath = activeTargetDir.replace(/^static\/?/, '');
      activeHugoPath = targetFileName ? `/${relativeWebPath}/${targetFileName}` : `/${relativeWebPath}`;
    } else {
      activeHugoPath = targetFileName ? `/${activeTargetDir}/${targetFileName}` : `/${activeTargetDir}`;
    }
  }

  const fullRepoPath = targetFileName ? `${activeTargetDir}/${targetFileName}` : activeTargetDir;

  const handleUpload = async () => {
    if (!selectedFile || !targetFileName) return;

    setUploading(true);
    setUploadResult(null);

    if (config.useMock || !config.token) {
      setTimeout(() => {
        setUploadResult({
          success: true,
          repoPath: fullRepoPath,
          hugoPath: activeHugoPath,
          downloadUrl: previewUrl || '',
        });
        setUploading(false);
      }, 700);
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Content = (reader.result as string).split(',')[1];
          const res = await uploadStaticAsset(
            config,
            fullRepoPath,
            base64Content,
            `asset(images): add ${targetFileName} to ${activeTargetDir}`
          );

          setUploadResult({
            success: true,
            repoPath: fullRepoPath,
            hugoPath: activeHugoPath,
            downloadUrl: res.downloadUrl,
          });
        } catch (err: any) {
          setUploadResult({
            success: false,
            error: err.message || '上传至 GitHub 仓库失败',
          });
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(selectedFile);
    } catch (err: any) {
      setUploadResult({
        success: false,
        error: err.message || '文件读取错误',
      });
      setUploading(false);
    }
  };

  const getMarkdownSnippet = () => {
    const path = uploadResult?.hugoPath || activeHugoPath || `./${targetFileName}`;
    return `![${targetFileName || '图片描述'}](${path})`;
  };

  const getShortcodeSnippet = () => {
    const path = uploadResult?.hugoPath || activeHugoPath || `./${targetFileName}`;
    return `{{< figure src="${path}" title="${targetFileName}" alt="${targetFileName}" >}}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-[#0b1120] rounded-2xl shadow-2xl border border-slate-800 text-slate-300 max-w-lg w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-white text-base">上传图片至 Hugo 仓库</h2>
              <p className="text-xs text-slate-400">
                支持上传到全局 static 静态目录或文章同级 Page Bundle 资源束
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="py-4 space-y-4 text-xs">
          {/* Destination Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>图片存储目标位置</span>
              <span className="text-[11px] text-slate-400">根据文章组织规范选择</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setUploadMode('static')}
                className={`p-2 rounded-lg border text-left transition-all ${
                  uploadMode === 'static'
                    ? 'bg-indigo-600/15 border-indigo-500/50 text-indigo-200'
                    : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-semibold text-[11px] flex items-center gap-1">
                  <Folder className="w-3.5 h-3.5 text-indigo-400" />
                  <span>全局静态目录</span>
                </div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5" title={config.staticDir || 'static/img'}>
                  {config.staticDir || 'static/img'}
                </div>
              </button>

              <button
                type="button"
                disabled={!currentPostDir}
                onClick={() => setUploadMode('bundle')}
                className={`p-2 rounded-lg border text-left transition-all ${
                  uploadMode === 'bundle'
                    ? 'bg-indigo-600/15 border-indigo-500/50 text-indigo-200'
                    : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed'
                }`}
              >
                <div className="font-semibold text-[11px] flex items-center gap-1">
                  <FolderArchive className="w-3.5 h-3.5 text-indigo-400" />
                  <span>文章同级目录</span>
                </div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5" title={currentPostDir || '需打开文章'}>
                  {currentPostDir ? 'Page Bundle 同级' : '需在文章中'}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setUploadMode('custom')}
                className={`p-2 rounded-lg border text-left transition-all ${
                  uploadMode === 'custom'
                    ? 'bg-indigo-600/15 border-indigo-500/50 text-indigo-200'
                    : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-semibold text-[11px] flex items-center gap-1">
                  <Link2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>自定义目录</span>
                </div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5">
                  手动指定路径
                </div>
              </button>
            </div>
          </div>

          {/* Drag and Drop Zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-700 hover:border-indigo-500/70 rounded-xl p-4 text-center cursor-pointer bg-slate-900/50 hover:bg-slate-900 transition-colors"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
              accept="image/*"
              className="hidden"
            />
            {previewUrl ? (
              <div className="space-y-2">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-h-32 mx-auto rounded-lg object-contain border border-slate-800 shadow-sm"
                />
                <p className="text-[11px] text-indigo-300">点击或重新拖拽可更换图片</p>
              </div>
            ) : (
              <div className="space-y-1.5 py-2">
                <Upload className="w-7 h-7 text-indigo-400 mx-auto" />
                <p className="font-medium text-slate-200">拖拽配图至此处，或点击浏览选择本地图片</p>
                <p className="text-[10px] text-slate-500">支持 WebP, PNG, JPG, SVG, GIF</p>
              </div>
            )}
          </div>

          {/* Target File details & Path configuration */}
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  目标存储目录
                </label>
                {uploadMode === 'custom' ? (
                  <input
                    type="text"
                    value={customDir}
                    onChange={(e) => setCustomDir(e.target.value)}
                    placeholder="static/img"
                    className="w-full px-2.5 py-1.5 bg-slate-950/80 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-600 font-mono text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                ) : (
                  <div className="px-2.5 py-1.5 bg-slate-950/80 border border-slate-800 rounded-lg text-slate-300 font-mono text-xs truncate">
                    {activeTargetDir}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  上传后文件名
                </label>
                <input
                  type="text"
                  value={targetFileName}
                  onChange={(e) => setTargetFileName(e.target.value)}
                  placeholder="cover.png"
                  className="w-full px-2.5 py-1.5 bg-slate-950/80 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-600 font-mono text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Path inspection box */}
            <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] font-mono space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 shrink-0">仓库写入路径:</span>
                <span className="text-slate-300 truncate">{fullRepoPath || '(等待选择文件)'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-indigo-400 shrink-0">Hugo 引用路径:</span>
                <span className="text-indigo-300 truncate font-semibold">{activeHugoPath || '(自动生成)'}</span>
              </div>
            </div>
          </div>

          {/* Upload result */}
          {uploadResult && (
            <div
              className={`p-3 rounded-xl border text-xs space-y-2.5 ${
                uploadResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
              }`}
            >
              <div className="flex items-center gap-1.5 font-medium">
                {uploadResult.success ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>上传成功！已自动适配 Hugo 引用路径: {uploadResult.hugoPath}</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                    <span>上传失败: {uploadResult.error}</span>
                  </>
                )}
              </div>

              {uploadResult.success && (
                <div className="pt-2 border-t border-emerald-500/20 flex items-center gap-2">
                  <button
                    onClick={() => {
                      onInsertMarkdown(`\n\n${getMarkdownSnippet()}\n\n`);
                      onClose();
                    }}
                    className="flex-1 py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                  >
                    <span>插入 Markdown</span>
                    <span className="font-mono text-[10px] opacity-80">![ ]()</span>
                  </button>
                  <button
                    onClick={() => {
                      onInsertMarkdown(`\n\n${getShortcodeSnippet()}\n\n`);
                      onClose();
                    }}
                    className="flex-1 py-1.5 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                  >
                    <span>插入 Hugo Shortcode</span>
                    <span className="font-mono text-[10px] opacity-80">figure</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-lg transition-colors"
          >
            取消
          </button>

          {!uploadResult?.success && (
            <button
              type="button"
              disabled={uploading || !selectedFile || !targetFileName}
              onClick={handleUpload}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors shadow-lg shadow-indigo-600/20"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>正在上传到 GitHub...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>开始上传图片</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
