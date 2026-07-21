import { useAccount, useConnect, useDisconnect } from 'wagmi';

const short = (addr?: string) => (addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : '');

export function HostWallet() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const injected = connectors[0];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: 16,
        background: '#1F2937',
        borderRadius: 12,
        marginBottom: 16,
        width: '100%',
        maxWidth: 512,
      }}
    >
      <div style={{ fontSize: 13, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Host page wallet (host's own wagmi)
      </div>
      {isConnected ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <code style={{ color: '#A7F3D0' }}>{short(address)}</code>
          <span style={{ color: '#6B7280' }}>chain: {chainId}</span>
          <button
            onClick={() => disconnect()}
            style={{ padding: '6px 12px', background: '#374151', color: '#fff', border: 0, borderRadius: 8, cursor: 'pointer' }}
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button
          onClick={() => injected && connect({ connector: injected })}
          disabled={!injected || isPending}
          style={{
            padding: '8px 16px',
            background: '#EC4899',
            color: '#fff',
            border: 0,
            borderRadius: 8,
            cursor: injected ? 'pointer' : 'not-allowed',
            fontWeight: 600,
            alignSelf: 'flex-start',
          }}
        >
          {isPending ? 'Connecting…' : injected ? `Connect (${injected.name})` : 'No injected wallet'}
        </button>
      )}
    </div>
  );
}
