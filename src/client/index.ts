// Auto-inject styles at runtime
const injectStyles = () => {
	if (typeof document === 'undefined') return;

	const STYLE_ID = 'next-drive-styles';
	if (document.getElementById(STYLE_ID)) return;

	const style = document.createElement('style');
	style.id = STYLE_ID;
	style.textContent = `
/* CSS Variables for next-drive components */
:root {
	--background: 0 0% 100%;
	--foreground: 222.2 84% 4.9%;
	--card: 0 0% 100%;
	--card-foreground: 222.2 84% 4.9%;
	--popover: 0 0% 100%;
	--popover-foreground: 222.2 84% 4.9%;
	--primary: 222.2 47.4% 11.2%;
	--primary-foreground: 210 40% 98%;
	--secondary: 210 40% 96.1%;
	--secondary-foreground: 222.2 47.4% 11.2%;
	--muted: 210 40% 96.1%;
	--muted-foreground: 215.4 16.3% 46.9%;
	--accent: 210 40% 96.1%;
	--accent-foreground: 222.2 47.4% 11.2%;
	--destructive: 0 84.2% 60.2%;
	--destructive-foreground: 210 40% 98%;
	--border: 214.3 31.8% 91.4%;
	--input: 214.3 31.8% 91.4%;
	--ring: 222.2 84% 4.9%;
	--radius: 0.5rem;
}
.dark {
	--background: 222.2 84% 4.9%;
	--foreground: 210 40% 98%;
	--card: 222.2 84% 4.9%;
	--card-foreground: 210 40% 98%;
	--popover: 222.2 84% 4.9%;
	--popover-foreground: 210 40% 98%;
	--primary: 210 40% 98%;
	--primary-foreground: 222.2 47.4% 11.2%;
	--secondary: 217.2 32.6% 17.5%;
	--secondary-foreground: 210 40% 98%;
	--muted: 217.2 32.6% 17.5%;
	--muted-foreground: 215 20.2% 65.1%;
	--accent: 217.2 32.6% 17.5%;
	--accent-foreground: 210 40% 98%;
	--destructive: 0 62.8% 30.6%;
	--destructive-foreground: 210 40% 98%;
	--border: 217.2 32.6% 17.5%;
	--input: 217.2 32.6% 17.5%;
	--ring: 212.7 26.8% 83.9%;
}
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
};

injectStyles();

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
