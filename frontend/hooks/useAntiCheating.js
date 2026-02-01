import { useEffect, useState } from 'react';

export const useAntiCheating = (onViolation) => {
    const [warnings, setWarnings] = useState(0);

    useEffect(() => {
        // 1. Detect Tab Switching / Visibility Change
        const handleVisibilityChange = () => {
            if (document.hidden) {
                setWarnings((prev) => prev + 1);
                if (onViolation) onViolation('Tab switch detected!');
            }
        };

        // 2. Disable Right Click
        const handleContextMenu = (e) => {
            e.preventDefault();
            // Optional: onViolation("Right click disabled!");
        };

        // 3. Disable Copy
        const handleCopy = (e) => {
            e.preventDefault();
            // Optional: onViolation("Copying is disabled!");
        };

        // 4. Disable Paste
        const handlePaste = (e) => {
            e.preventDefault();
            // Optional: onViolation("Pasting is disabled!");
        };

        // 5. Detect Blur (Window focus lost)
        const handleBlur = () => {
            // Strict mode: Treat blur as violation too? Often annoying if just clicking browser chrome.
            // Keeping it for now.
            // setWarnings((prev) => prev + 1);
            // if (onViolation) onViolation('Window focus lost!');
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('copy', handleCopy);
        document.addEventListener('paste', handlePaste);
        window.addEventListener('blur', handleBlur);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('copy', handleCopy);
            document.removeEventListener('paste', handlePaste);
            window.removeEventListener('blur', handleBlur);
        };
    }, [onViolation]);

    return { warnings };
};
