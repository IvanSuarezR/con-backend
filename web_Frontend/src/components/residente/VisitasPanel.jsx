import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { visitorService } from '../../api/visitorService';
import { userService } from '../../api/userService';
import QRCode from 'qrcode';
import QrScanner from 'qr-scanner';

const VisitasPanel = () => {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [qr, setQr] = useState(null);
  const [qrForm, setQrForm] = useState({ nombre_completo: '', documento_identidad: '', tipo_acceso: 'P', entradas_permitidas: 1, duracion_min: 60 });
  const [useRange, setUseRange] = useState(false);
  const [range, setRange] = useState({ fecha_inicio: '', hora_inicio: '', fecha_fin: '', hora_fin: '' });
  const [auths, setAuths] = useState([]);
  const [loadingAuths, setLoadingAuths] = useState(false);
  const [qrPng, setQrPng] = useState('');
  const fileInputRef = useRef(null);
  const [me, setMe] = useState(null);

  useEffect(() => {
    (async () => {
      try { setMe(await userService.getMe()); } catch {}
    })();
  }, []);

  const canGenPeatonal = !!(me?.is_staff || me?.residente?.tipo === 'PRINCIPAL' || me?.residente?.puede_generar_qr_peatonal);
  const canGenVehicular = !!(me?.is_staff || me?.residente?.tipo === 'PRINCIPAL' || me?.residente?.puede_generar_qr_vehicular);

  const handleQRChange = (e) => {
    const { name, value } = e.target;
    setQrForm((prev) => ({ ...prev, [name]: value }));
  };

  const generarQR = async () => {
    setBusy(true); setMsg(''); setQr(null);
    try {
      const payload = {
        nombre_completo: qrForm.nombre_completo,
        documento_identidad: qrForm.documento_identidad || undefined,
        tipo_acceso: qrForm.tipo_acceso,
        entradas_permitidas: Number(qrForm.entradas_permitidas) || 1,
        duracion_min: Number(qrForm.duracion_min) || 60,
      };
      if (useRange) {
        const fi = range.fecha_inicio ? `${range.fecha_inicio}T${range.hora_inicio || '00:00'}:00` : null;
        const ff = range.fecha_fin ? `${range.fecha_fin}T${range.hora_fin || '23:59'}:00` : null;
        if (fi) payload.fecha_inicio = fi;
        if (ff) payload.fecha_fin = ff;
        delete payload.duracion_min;
      }
  // Validar permisos en cliente para UX (el servidor tambien valida)
      if (qrForm.tipo_acceso === 'P' && !canGenPeatonal) throw new Error('No autorizado a generar QR peatonal');
      if (qrForm.tipo_acceso === 'V' && !canGenVehicular) throw new Error('No autorizado a generar QR vehicular');
      const res = await visitorService.generarQR(payload);
      setQr(res);
      // Preferir imagen del backend si viene, si no, generar localmente
      if (res?.qr_image) {
        setQrPng(res.qr_image);
      } else {
        const dataUrl = await QRCode.toDataURL(res.codigo_qr, { width: 220, margin: 1 });
        setQrPng(dataUrl);
      }
      await loadAutorizaciones();
      setMsg('QR generado correctamente');
    } catch (e) {
      setMsg(e?.response?.data?.error || 'No se pudo generar el QR');
    } finally { setBusy(false); }
  };

  const loadAutorizaciones = async () => {
    try {
      setLoadingAuths(true);
      const data = await visitorService.listAutorizaciones();
      setAuths(data || []);
    } catch (e) {
      // noop
    } finally { setLoadingAuths(false); }
  };

  useEffect(() => { loadAutorizaciones(); }, []);

  const isVigente = (a) => {
    const now = new Date();
    const ini = new Date(a.fecha_inicio);
    const fin = new Date(a.fecha_fin);
    return a.status === 'ACTIVA' && now >= ini && now <= fin;
  };

  const cancelarAutorizacion = async (id) => {
    try {
      await visitorService.cancelar(id);
      await loadAutorizaciones();
    } catch (e) {
      setMsg(e?.response?.data?.error || 'No se pudo cancelar la autorización');
    }
  };

  const handleUploadScan = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setBusy(true); setMsg('Escaneando QR...');
      const result = await QrScanner.scanImage(file, { returnDetailedScanResult: true });
      const codigo_qr = (result?.data || '').trim();
      if (!codigo_qr) throw new Error('No se pudo leer el QR');
  // Simular camara: validar ENTRADA peatonal por defecto
      const resp = await visitorService.validarQR({ codigo_qr, evento: 'ENTRADA', modalidad: 'PEATONAL' });
      setMsg(`QR válido. Acción: ${resp.accion || 'ENTRADA'}`);
      await loadAutorizaciones();
    } catch (err) {
      setMsg(err?.response?.data?.reason || err?.response?.data?.error || err?.message || 'Escaneo fallido');
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow space-y-4">
        <h3 className="font-medium">Visitantes - Generar QR</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-700">Nombre completo</label>
            <input name="nombre_completo" value={qrForm.nombre_completo} onChange={handleQRChange} className="mt-1 border rounded px-3 py-2 w-full" />
          </div>
          <div>
            <label className="block text-sm text-gray-700">Documento de identidad (opcional)</label>
            <input name="documento_identidad" value={qrForm.documento_identidad} onChange={handleQRChange} className="mt-1 border rounded px-3 py-2 w-full" placeholder="CI/NIT (opcional)" />
          </div>
          <div>
            <label className="block text-sm text-gray-700">Tipo de acceso</label>
            <select name="tipo_acceso" value={qrForm.tipo_acceso} onChange={handleQRChange} className="mt-1 border rounded px-3 py-2 w-full">
              <option value="P" disabled={!canGenPeatonal}>Peatonal {(!canGenPeatonal) && '(no autorizado)'}</option>
              <option value="V" disabled={!canGenVehicular}>Vehicular {(!canGenVehicular) && '(no autorizado)'}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-700">Entradas permitidas</label>
            <input name="entradas_permitidas" type="number" min="1" value={qrForm.entradas_permitidas} onChange={handleQRChange} className="mt-1 border rounded px-3 py-2 w-full" />
          </div>
          <div className="flex items-center gap-2 mt-6">
            <input id="useRange" type="checkbox" checked={useRange} onChange={(e) => setUseRange(e.target.checked)} />
            <label htmlFor="useRange" className="text-sm text-gray-700">Definir rango de fecha y hora</label>
          </div>
          {!useRange && (
            <div>
              <label className="block text-sm text-gray-700">Duración (minutos)</label>
              <input name="duracion_min" type="number" min="5" value={qrForm.duracion_min} onChange={handleQRChange} className="mt-1 border rounded px-3 py-2 w-full" />
            </div>
          )}
          {useRange && (
            <>
              <div>
                <label className="block text-sm text-gray-700">Fecha inicio</label>
                <input type="date" value={range.fecha_inicio} onChange={(e) => setRange((p) => ({ ...p, fecha_inicio: e.target.value }))} className="mt-1 border rounded px-3 py-2 w-full" />
              </div>
              <div>
                <label className="block text-sm text-gray-700">Hora inicio</label>
                <input type="time" value={range.hora_inicio} onChange={(e) => setRange((p) => ({ ...p, hora_inicio: e.target.value }))} className="mt-1 border rounded px-3 py-2 w-full" />
              </div>
              <div>
                <label className="block text-sm text-gray-700">Fecha fin</label>
                <input type="date" value={range.fecha_fin} onChange={(e) => setRange((p) => ({ ...p, fecha_fin: e.target.value }))} className="mt-1 border rounded px-3 py-2 w-full" />
              </div>
              <div>
                <label className="block text-sm text-gray-700">Hora fin</label>
                <input type="time" value={range.hora_fin} onChange={(e) => setRange((p) => ({ ...p, hora_fin: e.target.value }))} className="mt-1 border rounded px-3 py-2 w-full" />
              </div>
            </>
          )}
        </div>
        <div className="flex gap-3">
          <button disabled={busy || (!canGenPeatonal && qrForm.tipo_acceso==='P') || (!canGenVehicular && qrForm.tipo_acceso==='V')} onClick={generarQR} className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50">Generar QR</button>
          {(!canGenPeatonal && qrForm.tipo_acceso==='P') && <span className="text-sm text-red-600"> No autorizado para peatonal</span>}
          {(!canGenVehicular && qrForm.tipo_acceso==='V') && <span className="text-sm text-red-600"> No autorizado para vehicular</span>}
        </div>
        {qr && (
          <div className="mt-4 p-3 border rounded">
            <div className="text-sm text-gray-600">Código: <span className="font-mono">{qr.codigo_qr}</span></div>
            <div className="text-sm text-gray-600">Válido: {new Date(qr.fecha_inicio).toLocaleString()} - {new Date(qr.fecha_fin).toLocaleString()}</div>
            <div className="text-sm text-gray-600">Entradas restantes: {Math.max(0, (qr.entradas_permitidas || 0) - (qr.entradas_consumidas || 0))}</div>
            {qrPng && (
              <div className="mt-3 space-y-2">
                <img src={qrPng} alt="QR" className="w-40 h-40" />
                <div className="flex gap-2">
                  <a href={qrPng} download={`QR_${qr.codigo_qr}.png`} className="px-3 py-1 text-sm rounded border">Descargar imagen</a>
                </div>
                <div className="text-xs text-gray-500">Puedes descargar o compartir este QR. Para simular cámara, súbelo abajo y validaremos la entrada.</div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg shadow space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Visitas activas</h3>
        </div>
        {loadingAuths ? (
          <div className="text-sm text-gray-600">Cargando...</div>
        ) : (
          <ul className="space-y-2">
            {auths.filter(isVigente).map((a) => (
              <li key={a.id} className="p-3 border rounded">
                <div className="text-sm font-medium">
                  {a.visitante?.nombre_completo || 'Visitante'}
                  <span className="ml-2 text-xs text-gray-500">{a.visitante?.tipo_acceso === 'V' ? 'Vehicular' : 'Peatonal'}</span>
                </div>
                {a.visitante?.documento_identidad && (
                  <div className="text-xs text-gray-600">Doc: {a.visitante.documento_identidad}</div>
                )}
                <div className="text-xs text-gray-600">{new Date(a.fecha_inicio).toLocaleString()} → {new Date(a.fecha_fin).toLocaleString()}</div>
                <div className="text-xs text-gray-600">Entradas: {a.entradas_consumidas}/{a.entradas_permitidas} {a.dentro ? '· Dentro' : ''}</div>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <button onClick={() => navigator.clipboard?.writeText(a.codigo_qr)} className="px-2 py-1 text-xs rounded border">Copiar código</button>
                  {a.qr_image && (
                    <a href={a.qr_image} download={`QR_${a.codigo_qr}.png`} className="px-2 py-1 text-xs rounded border">Descargar</a>
                  )}
                  <button onClick={() => cancelarAutorizacion(a.id)} className="px-2 py-1 text-xs rounded border text-red-600">Cancelar</button>
                </div>
              </li>
            ))}
            {auths.filter(isVigente).length === 0 && (
              <li className="text-xs text-gray-500">No hay visitas activas</li>
            )}
          </ul>
        )}
        <div className="text-xs text-gray-500">Las visitas con vigencia vencida dejan de mostrarse automáticamente.</div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow space-y-3">
        <h3 className="font-medium">Simular cámara IA (subir foto con QR)</h3>
        <div className="text-sm text-gray-600">Sube una imagen que contenga un código QR. Leeremos el código y validaremos una ENTRADA.</div>
        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleUploadScan} />
      </div>
    </div>
  );
};

export default VisitasPanel;
