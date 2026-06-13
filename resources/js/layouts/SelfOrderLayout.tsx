import { Head } from '@inertiajs/react';
import { PropsWithChildren } from 'react';

type Props = {
    title?: string;
};

export default function SelfOrderLayout({ title = 'UrbanEats', children }: PropsWithChildren<Props>) {
    return (
        <>
            <Head>
                <title>{title}</title>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600;700&display=swap" rel="stylesheet" />
                <link
                    href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL,GRAD,opsz@400,0..1,0,24&display=swap"
                    rel="stylesheet"
                />
            </Head>
            <div className="self-order-theme bg-surface-container-highest text-foreground selection:bg-primary-fixed selection:text-on-primary-fixed pt-safe pb-safe min-h-screen antialiased flex justify-center">
                <div className="mx-auto w-full max-w-md bg-surface min-h-screen relative shadow-2xl shadow-surface-variant/50 overflow-x-hidden flex flex-col">
                    {children}
                </div>
            </div>
        </>
    );
}
