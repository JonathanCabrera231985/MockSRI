/**
 * High-Performance SRI Mock SOAP Server
 * Optimized for Stress Testing
 * 
 * Objectives:
 * 1. Emulate RecepcionComprobantesOffline and AutorizacionComprobantesOffline.
 * 2. Static responses with zero induced latency.
 * 3. Minimal I/O overhead (disabled individual request logging).
 */

const express = require('express');
const soap = require('soap');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 8080;

const SRI_ERRORS = {
    "27": { mensaje: "Clase no permitida", informacionAdicional: "La clase del contribuyente no puede emitir comprobantes electrónicos." },
    "28": { mensaje: "Acuerdo de medios electrónicos no aceptado", informacionAdicional: "Siempre el contribuyente debe haber aceptado el acuerdo de medio electrónicos." },
    "35": { mensaje: "Documento inválido / ARCHIVO NO CUMPLE ESTRUCTURA XML", informacionAdicional: "El XML no pasa validación de esquema." },
    "36": { mensaje: "Versión esquema descontinuada / ARCHIVO XML VACÍO", informacionAdicional: "La versión del esquema no es la correcta." },
    "37": { mensaje: "RUC sin autorización de emisión / RUC DEL EMISOR NO ACTIVO", informacionAdicional: "El RUC del emisor no cuenta con solicitud de emisión." },
    "39": { mensaje: "Firma inválida", informacionAdicional: "Firma electrónica del emisor no es válida." },
    "40": { mensaje: "Error en el certificado", informacionAdicional: "No se encontró el certificado o no se puede convertir en X509." },
    "43": { mensaje: "Clave acceso registrada", informacionAdicional: "La clave de acceso ya se encuentra registrada en la base de datos." },
    "45": { mensaje: "Secuencial registrado", informacionAdicional: "Secuencial del comprobante ya se encuentra registrado." },
    "46": { mensaje: "RUC no existe", informacionAdicional: "El RUC emisor no existe." },
    "47": { mensaje: "Tipo de comprobante no existe", informacionAdicional: "El tipo de comprobante no existe en el catálogo." },
    "48": { mensaje: "Esquema XSD no existe", informacionAdicional: "El esquema para el tipo de comprobante no existe." },
    "49": { mensaje: "Argumentos que envían al WS nulos", informacionAdicional: "Cuando se consume el WS con argumentos nulos o extemporáneo." },
    "50": { mensaje: "Error interno general / RUC CLAUSURADO", informacionAdicional: "Ocurre un error inesperado en el servidor." },
    "52": { mensaje: "Error en diferencias", informacionAdicional: "Existe error en los cálculos del comprobante." },
    "56": { mensaje: "Establecimiento cerrado", informacionAdicional: "El establecimiento se encuentra cerrado." },
    "57": { mensaje: "Autorización suspendida", informacionAdicional: "La autorización para emisión se encuentra suspendida." },
    "58": { mensaje: "Error en la estructura de clave acceso / ESTABLECIMIENTO CERRADO", informacionAdicional: "La clave de acceso tiene componentes diferentes a los del comprobante." },
    "60": { mensaje: "AMBIENTE INCORRECTO", informacionAdicional: "Comprobante de Pruebas enviado a Producción o viceversa." },
    "63": { mensaje: "RUC clausurado", informacionAdicional: "El RUC del emisor se encuentra clausurado." },
    "65": { mensaje: "Fecha de emisión extemporánea", informacionAdicional: "El comprobante emitido no fue enviado de acuerdo con el tiempo del tipo de emisión." },
    "67": { mensaje: "Fecha inválida", informacionAdicional: "Existe errores en el formato de la fecha." },
    "70": { mensaje: "Clave de acceso en procesamiento", informacionAdicional: "Enviado anteriormente y el mismo no ha terminado su procesamiento." },
    "82": { mensaje: "ERROR EN LA FECHA DE INICIO DE TRANSPORTE", informacionAdicional: "La fecha de inicio no es válida respecto a la emisión." },
    "99": { mensaje: "ERROR AL CONSULTAR DATOS DEL SERVICIO WEB", informacionAdicional: "Error de comunicación con los servicios del SRI." },
    "3000": { mensaje: "ERROR_FORMATO", informacionAdicional: "Error genérico de formato en los parámetros de envío." }
};

// SRI Recepcion Service Logic
const recepcionService = {
    RecepcionComprobantesOfflineService: {
        RecepcionComprobantesOfflinePort: {
            validarComprobante: (args, callback) => {
                let xmlString = '';
                try {
                    xmlString = Buffer.from(args.xml || '', 'base64').toString('utf8');
                } catch (e) {
                    // Ignore decode error
                }

                // Check for MOCK_ERR_XX trigger in the XML
                let errCode = null;
                for (let key of Object.keys(SRI_ERRORS)) {
                    if (xmlString.includes('MOCK_ERR_' + key)) {
                        errCode = key;
                        break;
                    }
                }

                if (errCode) {
                    const errObj = SRI_ERRORS[errCode];
                    callback({
                        RespuestaRecepcionComprobante: {
                            estado: 'DEVUELTA',
                            comprobantes: {
                                comprobante: [{
                                    mensajes: {
                                        mensaje: [{
                                            identificador: errCode,
                                            mensaje: errObj.mensaje,
                                            informacionAdicional: errObj.informacionAdicional,
                                            tipo: 'ERROR'
                                        }]
                                    }
                                }]
                            }
                        }
                    });
                    return;
                }

                // Return "RECIBIDA" invariably, skipping any validation.
                callback({
                    RespuestaRecepcionComprobante: {
                        estado: 'RECIBIDA',
                        comprobantes: []
                    }
                });
            }
        }
    }
};

// SRI Autorizacion Service Logic
const autorizacionService = {
    AutorizacionComprobantesOfflineService: {
        AutorizacionComprobantesOfflinePort: {
            autorizacionComprobante: (args, callback) => {
                // Return "AUTORIZADO" with generic 37-digit number and current timestamp.
                const now = new Date().toISOString();
                const genericAuth = '1234567890123456789012345678901234567'; // 37 digits
                const clave = args.claveAccesoComprobante || '';

                // Check if clave contains 99900 followed by an exact error code
                let errCode = null;
                for (let key of Object.keys(SRI_ERRORS)) {
                    if (clave.includes('99900' + key)) {
                        errCode = key;
                        break;
                    }
                }

                if (errCode) {
                    const errObj = SRI_ERRORS[errCode];
                    callback({
                        RespuestaAutorizacionComprobante: {
                            claveAccesoConsultada: clave || '0'.repeat(49),
                            numeroComprobantes: '1',
                            autorizaciones: {
                                autorizacion: [{
                                    estado: 'RECHAZADO',
                                    numeroAutorizacion: '',
                                    fechaAutorizacion: now,
                                    ambiente: 'PRUEBAS',
                                    mensajes: {
                                        mensaje: [{
                                            identificador: errCode,
                                            mensaje: errObj.mensaje,
                                            informacionAdicional: errObj.informacionAdicional,
                                            tipo: 'ERROR'
                                        }]
                                    }
                                }]
                            }
                        }
                    });
                    return;
                }

                callback({
                    RespuestaAutorizacionComprobante: {
                        claveAccesoConsultada: clave || '0'.repeat(49),
                        numeroComprobantes: '1',
                        autorizaciones: {
                            autorizacion: [{
                                estado: 'AUTORIZADO',
                                numeroAutorizacion: genericAuth,
                                fechaAutorizacion: now,
                                ambiente: 'PRUEBAS',
                                comprobante: '<!-- XML Comprobante Mock -->',
                                mensajes: []
                            }]
                        }
                    }
                });
            },
            autorizacionComprobanteLote: (args, callback) => {
                // Minimal lottery response if requested
                callback({
                    RespuestaAutorizacionLote: {
                        claveAccesoLoteConsultada: args.claveAccesoLote || '0',
                        numeroComprobantesLote: '0',
                        autorizaciones: { autorizacion: [] }
                    }
                });
            }
        }
    }
};

// Pre-load WSDL content to handle high-concurrency requests from memory
const wsdlRecepcion = fs.readFileSync(path.join(__dirname, 'RecepcionComprobantesOffline.wsdl'), 'utf8');
const wsdlAutorizacion = fs.readFileSync(path.join(__dirname, 'AutorizacionComprobantesOffline.wsdl'), 'utf8');

if (require.main === module) {
    app.listen(port, () => {
        // Expose SRI endpoints on port 8080
        soap.listen(app, '/comprobantes-electronicos-ws/RecepcionComprobantesOffline', recepcionService, wsdlRecepcion);
        soap.listen(app, '/comprobantes-electronicos-ws/AutorizacionComprobantesOffline', autorizacionService, wsdlAutorizacion);

        console.log(`[SRI MOCK] Server started on port ${port}`);
        console.log(`[SRI MOCK] Recepcion endpoint: http://localhost:${port}/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl`);
        console.log(`[SRI MOCK] Autorizacion endpoint: http://localhost:${port}/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl`);
        console.log('[SRI MOCK] Performance logging: DISABLED (Individual requests are not logged to stdout).');
    });
}

module.exports = {
    recepcionService,
    autorizacionService
};
