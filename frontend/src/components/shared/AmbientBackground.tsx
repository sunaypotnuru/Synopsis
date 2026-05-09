export function AmbientBackground() {
    return (
        <div
            className="fixed inset-0 pointer-events-none z-[-1]"
            style={{
                background: 'linear-gradient(135deg, #f0fdfa 0%, #f8fafc 30%, #f0f9ff 60%, #faf5ff 100%)',
            }}
        />
    );
}

