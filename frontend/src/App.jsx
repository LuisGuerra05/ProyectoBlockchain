import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import './index.css'
import logoSvg from './assets/logo.svg'

// Dirección del contrato desplegado en Sepolia y su ABI mínimo
const CONTRACT_ADDRESS = '0x73ee4f0D0898180Eb30e6887188245c50E9a54Cc'
const CONTRACT_ABI = [
  'function registerCertificate(bytes32 certHash) external',
  'function verifyCertificate(bytes32 certHash) external view returns (bool)',
  'function authorizedIssuers(address) external view returns (bool)',
  'function authorizeIssuer(address issuer) external',
  'function revokeIssuer(address issuer) external',
  'function owner() external view returns (address)',
  'error NotAuthorized()',
  'error AlreadyRegistered()',
  'error NotOwner()',
]

export default function App() {
  const [wallet, setWallet] = useState(null)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [activeTab, setActiveTab] = useState('verify')

  // Estado para el flujo de registro
  const [regFile, setRegFile] = useState(null)
  const [regStatus, setRegStatus] = useState(null)
  const [regLoading, setRegLoading] = useState(false)

  // Estado para el flujo de verificación
  const [verFile, setVerFile] = useState(null)
  const [verStatus, setVerStatus] = useState(null)
  const [verLoading, setVerLoading] = useState(false)

  // Estado para el flujo de administración
  const [adminAddress, setAdminAddress] = useState('')
  const [adminStatus, setAdminStatus] = useState(null)
  const [adminLoading, setAdminLoading] = useState(false)

  // Dada una dirección, consulta el contrato y devuelve si es issuer autorizado y/o owner
  async function getWalletPermissions(address) {
    const provider = new ethers.BrowserProvider(window.ethereum)
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider)
    const authorized = await contract.authorizedIssuers(address)
    const ownerAddress = await contract.owner()
    const owner = ownerAddress.toLowerCase() === address.toLowerCase()
    return { authorized, owner }
  }

  // Al cargar la página, verifica si MetaMask ya tenía una sesión activa
  useEffect(() => {
    async function checkConnection() {
      if (!window.ethereum) return
      const accounts = await window.ethereum.request({ method: 'eth_accounts' })
      if (accounts.length > 0) {
        const address = accounts[0]
        const { authorized, owner } = await getWalletPermissions(address)
        setWallet(address)
        setIsAuthorized(authorized)
        setIsOwner(owner)
        if (authorized) setActiveTab('register')
      }
    }
    checkConnection()
  }, [])

  // Escucha cambios de cuenta en MetaMask y actualiza la UI sin recargar la página
  useEffect(() => {
    if (!window.ethereum) return

    async function handleAccountsChanged(accounts) {
      if (accounts.length === 0) {
        // El usuario bloqueó MetaMask o revocó el permiso del sitio
        disconnectWallet()
        return
      }
      const address = accounts[0]
      const { authorized, owner } = await getWalletPermissions(address)
      setWallet(address)
      setIsAuthorized(authorized)
      setIsOwner(owner)
      // Si la pestaña activa ya no tiene sentido para la nueva cuenta, volvemos a "Verificar"
      setActiveTab(prev => {
        if (prev === 'admin' && !owner) return 'verify'
        if (prev === 'register' && !authorized) return 'verify'
        return prev
      })
    }

    window.ethereum.on('accountsChanged', handleAccountsChanged)
    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
    }
  }, [])

  // MetaMask no emite 'accountsChanged' cuando solo se bloquea la extensión,
  // así que verificamos periódicamente si la cuenta sigue disponible.
  useEffect(() => {
    if (!window.ethereum) return

    const interval = setInterval(async () => {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' })
      if (accounts.length === 0) {
        if (wallet !== null) disconnectWallet()
      } else if (accounts[0].toLowerCase() !== wallet?.toLowerCase()) {
        // Por si el cambio de cuenta tampoco se detectó vía accountsChanged
        const address = accounts[0]
        const { authorized, owner } = await getWalletPermissions(address)
        setWallet(address)
        setIsAuthorized(authorized)
        setIsOwner(owner)
      }
    }, 1500)

    return () => clearInterval(interval)
  }, [wallet])

  // Solicita acceso a MetaMask, obtiene la dirección y verifica permisos en el contrato
  async function connectWallet() {
    if (!window.ethereum) {
      alert('MetaMask no está instalado.')
      return
    }
    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const address = await signer.getAddress()
      const { authorized, owner } = await getWalletPermissions(address)
      setWallet(address)
      setIsAuthorized(authorized)
      setIsOwner(owner)
      if (authorized) setActiveTab('register')
    } catch (err) {
      console.error(err)
    }
  }

  // Limpia todos los estados para simular un cierre de sesión
  async function disconnectWallet() {
    // Revoca el permiso real en MetaMask (EIP-2255), para que la próxima
    // conexión vuelva a mostrar el popup de selección de cuenta
    try {
      if (window.ethereum?.request) {
        await window.ethereum.request({
          method: 'wallet_revokePermissions',
          params: [{ eth_accounts: {} }],
        })
      }
    } catch (err) {
      // Si la versión de MetaMask no soporta este método, lo ignoramos
      console.warn('No se pudo revocar el permiso en MetaMask:', err)
    }

    setWallet(null)
    setIsAuthorized(false)
    setIsOwner(false)
    setActiveTab('verify')
    setRegFile(null)
    setVerFile(null)
    setRegStatus(null)
    setVerStatus(null)
    setAdminAddress('')
    setAdminStatus(null)
  }

  // Calcula el hash SHA-256 del archivo para enviarlo al contrato
  async function hashFile(file) {
    const buffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
    return '0x' + Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }

  // Helper para identificar el tipo de error del contrato por su selector hexadecimal
  function parseContractError(err) {
    const data = err?.data || err?.error?.data || err?.info?.error?.data
    const msg = err?.reason || err?.message || ''
    if (data === '0x3a81d6fc' || msg.includes('AlreadyRegistered')) return 'AlreadyRegistered'
    if (data === '0xea8e4eb5' || msg.includes('NotAuthorized')) return 'NotAuthorized'
    if (data === '0x30cd7471' || msg.includes('NotOwner')) return 'NotOwner'
    return null
  }

  // Calcula el hash del PDF y envía una transacción al contrato para registrarlo
  async function handleRegister() {
    if (!regFile) return
    setRegLoading(true)
    setRegStatus(null)
    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer)
      const hash = await hashFile(regFile)
      const tx = await contract.registerCertificate(hash)
      await tx.wait()
      setRegStatus({ type: 'success', msg: 'Certificado registrado exitosamente en la blockchain.' })
      setRegFile(null)
    } catch (err) {
      const errorType = parseContractError(err)
      if (errorType === 'AlreadyRegistered') {
        setRegStatus({ type: 'error', msg: 'Este certificado ya fue registrado anteriormente.' })
      } else if (errorType === 'NotAuthorized') {
        setRegStatus({ type: 'error', msg: 'Tu wallet no está autorizada para registrar certificados.' })
      } else {
        setRegStatus({ type: 'error', msg: 'Error al registrar: ' + (err?.message || 'Error desconocido') })
      }
    }
    setRegLoading(false)
    // El mensaje desaparece automáticamente después de 5 segundos
    setTimeout(() => setRegStatus(null), 5000)
  }

  // Calcula el hash del PDF y consulta el contrato para verificar si está registrado
  async function handleVerify() {
    if (!verFile) return
    setVerLoading(true)
    setVerStatus(null)
    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const hash = await hashFile(verFile)
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider)
      const exists = await contract.verifyCertificate(hash)
      if (exists) {
        setVerStatus({ type: 'success', msg: 'Certificado auténtico. Este documento está registrado en la blockchain.' })
      } else {
        setVerStatus({ type: 'error', msg: 'Certificado no encontrado. Este documento no fue registrado o fue modificado.' })
      }
    } catch (err) {
      setVerStatus({ type: 'error', msg: 'Error al verificar: ' + (err?.message || 'Error desconocido') })
    }
    setVerLoading(false)
    // El mensaje desaparece automáticamente después de 5 segundos
    setTimeout(() => setVerStatus(null), 5000)
  }

  // Autoriza una nueva wallet como issuer. Solo el owner puede ejecutar esta acción
  async function handleAuthorize() {
    if (!adminAddress) return
    setAdminLoading(true)
    setAdminStatus(null)
    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer)
      const tx = await contract.authorizeIssuer(adminAddress)
      await tx.wait()
      setAdminStatus({ type: 'success', msg: `Wallet ${adminAddress.slice(0,6)}...${adminAddress.slice(-4)} autorizada exitosamente.` })
      setAdminAddress('')
    } catch (err) {
      const errorType = parseContractError(err)
      if (errorType === 'NotOwner') {
        setAdminStatus({ type: 'error', msg: 'Solo el owner puede autorizar wallets.' })
      } else {
        setAdminStatus({ type: 'error', msg: 'Error al autorizar: ' + (err?.message || 'Error desconocido') })
      }
    }
    setAdminLoading(false)
    setTimeout(() => setAdminStatus(null), 5000)
  }

  // Revoca los permisos de una wallet. Solo el owner puede ejecutar esta acción
  async function handleRevoke() {
    if (!adminAddress) return
    setAdminLoading(true)
    setAdminStatus(null)
    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer)
      const tx = await contract.revokeIssuer(adminAddress)
      await tx.wait()
      setAdminStatus({ type: 'success', msg: `Wallet ${adminAddress.slice(0,6)}...${adminAddress.slice(-4)} revocada exitosamente.` })
      setAdminAddress('')
    } catch (err) {
      const errorType = parseContractError(err)
      if (errorType === 'NotOwner') {
        setAdminStatus({ type: 'error', msg: 'Solo el owner puede revocar wallets.' })
      } else {
        setAdminStatus({ type: 'error', msg: 'Error al revocar: ' + (err?.message || 'Error desconocido') })
      }
    }
    setAdminLoading(false)
    setTimeout(() => setAdminStatus(null), 5000)
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <img src={logoSvg} alt="CertiChain" style={{width: '42px', height: '36px', flexShrink: 0}} />
            <span>CertiChain</span>
          </div>
          {!wallet ? (
            <button className="btn-connect" onClick={connectWallet}>
              <i className="bi bi-wallet2"></i> Conectar wallet
            </button>
          ) : (
            <div className="wallet-info">
              <i className="bi bi-circle-fill connected-dot"></i>
              <span>{wallet.slice(0, 6)}...{wallet.slice(-4)}</span>
              {isOwner
                ? <span className="badge-owner">Owner</span>
                : isAuthorized && <span className="badge-authorized">Autorizado</span>
              }
              <button className="btn-disconnect" onClick={disconnectWallet}>
                <i className="bi bi-box-arrow-right"></i> Salir
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="main">
        <div className="hero">
          <h1>Verificación de certificados en blockchain</h1>
          <p>Registra y verifica la autenticidad de certificados académicos de forma descentralizada e inalterable.</p>
        </div>

        {/* Si no hay wallet conectada, muestra la pantalla de conexión */}
        {!wallet ? (
          <div className="connect-prompt">
            <i className="bi bi-wallet2"></i>
            <p>Conecta tu wallet para comenzar</p>
            <button className="btn-primary" onClick={connectWallet}>
              <i className="bi bi-wallet2"></i> Conectar con MetaMask
            </button>
          </div>
        ) : (
          <div className="content">
            <div className="tabs">
              {/* La pestaña de registro solo aparece si la wallet está autorizada */}
              {isAuthorized && (
                <button
                  className={`tab ${activeTab === 'register' ? 'active' : ''}`}
                  onClick={() => setActiveTab('register')}
                >
                  <i className="bi bi-cloud-upload"></i> Registrar certificado
                </button>
              )}
              <button
                className={`tab ${activeTab === 'verify' ? 'active' : ''}`}
                onClick={() => setActiveTab('verify')}
              >
                <i className="bi bi-shield-check"></i> Verificar certificado
              </button>
              {/* La pestaña de administración solo aparece si la wallet es el owner */}
              {isOwner && (
                <button
                  className={`tab ${activeTab === 'admin' ? 'active' : ''}`}
                  onClick={() => setActiveTab('admin')}
                >
                  <i className="bi bi-gear"></i> Administrar
                </button>
              )}
            </div>

            {/* Panel de registro */}
            {activeTab === 'register' && isAuthorized && (
              <div className="card">
                <h2><i className="bi bi-cloud-upload"></i> Registrar certificado</h2>
                <p className="card-desc">Sube el PDF del certificado para calcular su hash y registrarlo en la blockchain.</p>

                <label className="file-drop" htmlFor="reg-file">
                  <i className="bi bi-file-earmark-pdf"></i>
                  <span>{regFile ? regFile.name : 'Haz clic para seleccionar un PDF'}</span>
                  <small>{regFile ? (regFile.size / 1024).toFixed(1) + ' KB' : 'Solo archivos PDF'}</small>
                </label>
                <input
                  id="reg-file"
                  type="file"
                  accept=".pdf"
                  onChange={e => { setRegFile(e.target.files[0]); setRegStatus(null) }}
                />

                <button
                  className="btn-primary"
                  onClick={handleRegister}
                  disabled={!regFile || regLoading}
                >
                  {regLoading
                    ? <><i className="bi bi-hourglass-split"></i> Registrando...</>
                    : <><i className="bi bi-cloud-upload"></i> Registrar en blockchain</>
                  }
                </button>

                {regStatus && (
                  <div className={`status-msg ${regStatus.type}`}>
                    <i className={`bi ${regStatus.type === 'success' ? 'bi-check-circle' : 'bi-x-circle'}`}></i>
                    {regStatus.msg}
                  </div>
                )}
              </div>
            )}

            {/* Panel de verificación */}
            {activeTab === 'verify' && (
              <div className="card">
                <h2><i className="bi bi-shield-check"></i> Verificar certificado</h2>
                <p className="card-desc">Sube el PDF del certificado para comprobar si está registrado en la blockchain.</p>

                <label className="file-drop" htmlFor="ver-file">
                  <i className="bi bi-file-earmark-pdf"></i>
                  <span>{verFile ? verFile.name : 'Haz clic para seleccionar un PDF'}</span>
                  <small>{verFile ? (verFile.size / 1024).toFixed(1) + ' KB' : 'Solo archivos PDF'}</small>
                </label>
                <input
                  id="ver-file"
                  type="file"
                  accept=".pdf"
                  onChange={e => { setVerFile(e.target.files[0]); setVerStatus(null) }}
                />

                <button
                  className="btn-primary verify"
                  onClick={handleVerify}
                  disabled={!verFile || verLoading}
                >
                  {verLoading
                    ? <><i className="bi bi-hourglass-split"></i> Verificando...</>
                    : <><i className="bi bi-shield-check"></i> Verificar certificado</>
                  }
                </button>

                {verStatus && (
                  <div className={`status-msg ${verStatus.type}`}>
                    <i className={`bi ${verStatus.type === 'success' ? 'bi-check-circle' : 'bi-x-circle'}`}></i>
                    {verStatus.msg}
                  </div>
                )}
              </div>
            )}

            {/* Panel de administración, solo visible para el owner */}
            {activeTab === 'admin' && isOwner && (
              <div className="card">
                <h2><i className="bi bi-gear"></i> Administrar issuers</h2>
                <p className="card-desc">Autoriza o revoca wallets para que puedan registrar certificados en la blockchain.</p>

                <label className="input-label">Dirección de la wallet</label>
                <input
                  className="input-address"
                  type="text"
                  placeholder="0x..."
                  value={adminAddress}
                  onChange={e => { setAdminAddress(e.target.value); setAdminStatus(null) }}
                />

                <div className="admin-buttons">
                  <button
                    className="btn-primary"
                    onClick={handleAuthorize}
                    disabled={!adminAddress || adminLoading}
                  >
                    {adminLoading
                      ? <><i className="bi bi-hourglass-split"></i> Procesando...</>
                      : <><i className="bi bi-person-check"></i> Autorizar wallet</>
                    }
                  </button>
                  <button
                    className="btn-primary revoke"
                    onClick={handleRevoke}
                    disabled={!adminAddress || adminLoading}
                  >
                    {adminLoading
                      ? <><i className="bi bi-hourglass-split"></i> Procesando...</>
                      : <><i className="bi bi-person-x"></i> Revocar wallet</>
                    }
                  </button>
                </div>

                {adminStatus && (
                  <div className={`status-msg ${adminStatus.type}`}>
                    <i className={`bi ${adminStatus.type === 'success' ? 'bi-check-circle' : 'bi-x-circle'}`}></i>
                    {adminStatus.msg}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}