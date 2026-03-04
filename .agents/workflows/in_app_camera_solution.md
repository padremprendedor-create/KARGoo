---
description: How to implement the In-App Camera capture to prevent Android RAM browser reloads
---

## Problema
En dispositivos móviles con poca memoria RAM (especialmente Android), al abrir una etiqueta `<input type="file" capture="environment">` o incluso un input normal para seleccionar archivos de la galería, el sistema operativo (OS) suspende el navegador para liberar recursos y abrir la aplicación nativa de Cámara/Galería. 
Cuando el usuario toma la foto y regresa al navegador, el OS en lugar de reanudar el estado anterior, **recarga la página completa**, causando que se pierda el flujo que el usuario estaba realizando (formularios a la mitad, estados locales borrados).

## Solución: In-App CameraCapture Component
Para evitar abrir aplicaciones nativas y mantener la sesión web activa, utilizamos el API de MediaDevices (`navigator.mediaDevices.getUserMedia`) para renderizar directamente el feed de video del dispositivo dentro de un elemento `<video>` en el DOM usando un componente propio llamado `CameraCapture`.

### Componentes Involucrados
1. **`CameraCapture.jsx`**: Renderiza la cámara del usuario en pantalla completa con overlay de encuadre. Se encarga de capturar el `canvas` y devolver una imagen `base64`.
2. **`PhotoConfirmModal.jsx`**: Muestra una previsualización de la foto en `base64` tomada desde `CameraCapture` y le permite al usuario "Confirmar" o "Tomar de nuevo".

### Pasos de Implementación

**1. Importar los Componentes**
```javascript
import CameraCapture from '../components/CameraCapture';
import PhotoConfirmModal from '../components/PhotoConfirmModal';
```

**2. Crear los Estados Locales**
Necesitamos estados para manejar la visibilidad de la cámara, el tipo de cámara (si hay múltiples en el mismo componente) y la foto capturada temporalmente pendiende de confirmación.
```javascript
const [showCamera, setShowCamera] = useState(false);
const [cameraType, setCameraType] = useState(null); 
const [pendingPhoto, setPendingPhoto] = useState(null);
```

**3. Renderizar los Componentes en el JSX (fuera del flujo normal, ej. al final del Return)**
```javascript
{/* In-App Camera */}
{showCamera && (
    <CameraCapture
        onCapture={(imageData) => {
            setPendingPhoto(imageData);
            setShowCamera(false);
        }}
        onClose={() => {
            setShowCamera(false);
            setCameraType(null);
        }}
        overlayText="Encuadre la foto"
    />
)}

{/* Confirmación Modal */}
{pendingPhoto && (
    <PhotoConfirmModal
        photoSrc={pendingPhoto}
        title="Confirmar Foto"
        subtitle="Verifique la legibilidad."
        confirmLabel="Subir Foto"
        onConfirm={handleConfirmPhoto}
        onRetake={() => {
            setPendingPhoto(null);
            setShowCamera(true);
        }}
        onCancel={() => {
            setPendingPhoto(null);
            setCameraType(null);
        }}
    />
)}
```

**4. Botón Disparador**
Cambiar el antiguo `<button onClick={() => fileRef.current.click()}>` por:
```javascript
<button
    onClick={() => {
        setCameraType('tipo_documento'); // Opcional si hay varios tipos
        setShowCamera(true);
    }}
>
    Tomar Foto
</button>
```

**5. Convertir el Base64 a Blob y Subir (Ejemplo Supabase)**
El `PhotoConfirmModal` llamará a `handleConfirmPhoto` que pasará el Base64 almacenado a un Blob válido para subir a Storage.
```javascript
const handleConfirmPhoto = async () => {
    if (!pendingPhoto) return;
    
    // Convert base64 to Blob
    const response = await fetch(pendingPhoto);
    const blob = await response.blob();
    const ext = blob.type.split('/')[1] || 'jpg';
    
    const filePath = `ruta/archivo_${Date.now()}.${ext}`;
    
    // Subir a Storage
    const { error: uploadError } = await supabase.storage
        .from('bucket-name')
        .upload(filePath, blob);
        
    if (uploadError) console.error(uploadError);
    
    setPendingPhoto(null);
    setCameraType(null);
};
```
