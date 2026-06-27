interface AppLogoIconProps {
    className?: string;
}

export default function AppLogoIcon({ className }: AppLogoIconProps) {
    return <img src="/logokarcisqu.png" alt="Karcisqu" className={className} />;
}
