import React from 'react';

// Toast 提示组件
interface ToastProps {
    message: string;
    type?: 'success' | 'error' | 'info';
    onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'info', onClose }) => {
    const bgColor = type === 'success' ? 'bg-green-50' : type === 'error' ? 'bg-red-50' : 'bg-blue-50';
    const borderColor = type === 'success' ? 'border-green-300' : type === 'error' ? 'border-red-300' : 'border-blue-300';
    const textColor = type === 'success' ? 'text-green-800' : type === 'error' ? 'text-red-800' : 'text-blue-800';

    React.useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top duration-300">
            <div className={`${bgColor} ${textColor} px-6 py-4 rounded-sm border-2 ${borderColor} shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] max-w-sm`}>
                <div className="flex items-center gap-3">
                    {type === 'success' && (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                    )}
                    {type === 'error' && (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="15" x2="9" y1="9" y2="15" />
                            <line x1="9" x2="15" y1="9" y2="15" />
                        </svg>
                    )}
                    {type === 'info' && (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" x2="12" y1="16" y2="12" />
                            <line x1="12" x2="12.01" y1="8" y2="8" />
                        </svg>
                    )}
                    <p className="font-hand text-sm font-bold">{message}</p>
                </div>
            </div>
        </div>
    );
};

// Confirm 对话框组件
interface ConfirmDialogProps {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    title,
    message,
    confirmText = '确认',
    cancelText = '取消',
    onConfirm,
    onCancel,
}) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#F8F5E6] border-2 border-zinc-800 rounded-sm shadow-[8px_8px_0px_0px_rgba(40,40,40,1)] max-w-md w-full animate-in zoom-in-95 duration-200">
                {/* 标题 */}
                <div className="border-b-2 border-zinc-300 px-6 py-4">
                    <h3 className="font-hand text-xl font-bold text-zinc-800">{title}</h3>
                </div>

                {/* 内容 */}
                <div className="px-6 py-6">
                    <p className="text-zinc-700 leading-relaxed">{message}</p>
                </div>

                {/* 按钮 */}
                <div className="border-t-2 border-zinc-300 px-6 py-4 flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 font-hand font-bold border-2 border-zinc-400 bg-white rounded-sm hover:bg-zinc-100 transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 font-hand font-bold border-2 border-zinc-800 bg-zinc-800 text-white rounded-sm hover:bg-zinc-700 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]"
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
