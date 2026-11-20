export interface OAuthFlowOptions {
  url: string;
  platform: string;
  onDiscoveryReady?: (discoverySessionId: string) => void;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  onClose?: () => void;
}

export function openOAuthFlow(options: OAuthFlowOptions): { windowRef: Window | null; cleanup: () => void } {
  const { url, platform, onDiscoveryReady, onSuccess, onError, onClose } = options;
  const windowName = `livingtech_oauth_${platform}`;
  const windowFeatures = 'width=640,height=740,scrollbars=yes,resizable=yes';

  const popup = window.open(url, windowName, windowFeatures);

  const onMessage = (event: MessageEvent) => {
    const origin = event.origin;
    if (!origin.endsWith('.run.app') && !origin.includes('localhost') && origin !== window.location.origin) {
      return;
    }

    if (event.data?.type === 'OAUTH_DISCOVERY_READY' && event.data?.discoverySessionId) {
      if (onDiscoveryReady) {
        onDiscoveryReady(String(event.data.discoverySessionId));
      }
    } else if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
      if (onSuccess) {
        onSuccess(event.data.message || 'Social account successfully connected.');
      }
      cleanup();
    } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
      if (onError) {
        onError(event.data.message || 'OAuth authorization did not complete.');
      }
      cleanup();
    }
  };

  window.addEventListener('message', onMessage);

  const pollTimer = setInterval(() => {
    if (popup && popup.closed) {
      clearInterval(pollTimer);
      window.removeEventListener('message', onMessage);
      if (onClose) onClose();
    }
  }, 1000);

  const cleanup = () => {
    clearInterval(pollTimer);
    window.removeEventListener('message', onMessage);
    if (popup && !popup.closed) {
      try {
        popup.close();
      } catch {
        // ignore
      }
    }
  };

  return { windowRef: popup, cleanup };
}
