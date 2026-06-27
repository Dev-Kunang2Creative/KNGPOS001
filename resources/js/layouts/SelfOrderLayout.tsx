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
                <link
                    href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL,GRAD,opsz@400,0..1,0,24&display=swap"
                    rel="stylesheet"
                />
            </Head>
            <div className="self-order-theme bg-surface-container-highest text-foreground selection:bg-primary-fixed selection:text-on-primary-fixed pt-safe pb-safe flex min-h-screen justify-center font-sans antialiased">
                <div className="bg-surface shadow-surface-variant/50 relative mx-auto flex min-h-screen w-full max-w-md flex-col overflow-x-hidden font-sans shadow-2xl">
                    {children}
                </div>
            </div>
        </>
    );
}
