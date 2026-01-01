// Auto-inject styles at runtime
if (typeof document !== 'undefined') {
	const STYLE_ID = 'next-drive-styles';
	if (!document.getElementById(STYLE_ID)) {
		const style = document.createElement('style');
		style.id = STYLE_ID;
		style.textContent = `
@keyframes indeterminate {
    0% { transform: translateX(-100%); }
    50% { transform: translateX(200%); }
    100% { transform: translateX(-100%); }
}
.animate-indeterminate {
    animation: indeterminate 1.5s ease-in-out infinite;
}
        `;
		document.head.appendChild(style);
	}
}

export * from './context';
export * from './hooks/useUpload';
export * from '@/client/file-chooser';
export * from '@/client/components/drive/explorer';
export * from '@/client/components/drive/file-grid';
export * from '@/client/components/drive/dnd-provider';
export * from '@/client/components/drive/path-bar';
export * from '@/client/components/drive/upload';
export * from '@/client/components/drive/storage/indicator';
export * from '@/client/components/drive/header';
export * from '@/client/components/drive/sidebar';
export type { TDriveFile, TImageQuality, TImageFormat } from '@/types/client';
export { driveFileSchemaZod } from '@/types/client';
