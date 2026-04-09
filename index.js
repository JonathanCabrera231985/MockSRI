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
    "27": "Clase no permitida",
    "28": "Acuerdo de medios electrónicos no aceptado",
    "35": "Documento inválido / ARCHIVO NO CUMPLE ESTRUCTURA XML",
    "36": "Versión esquema descontinuada / ARCHIVO XML VACÍO",
    "37": "RUC sin autorización de emisión / RUC DEL EMISOR NO ACTIVO",
    "39": "Firma inválida",
    "40": "Error en el certificado",
    "43": "Clave acceso registrada",
    "45": "Secuencial registrado",
    "46": "RUC no existe",
    "47": "Tipo de comprobante no existe",
    "48": "Esquema XSD no existe",
    "49": "Argumentos que envían al WS nulos",
    "50": "Error interno general / RUC CLAUSURADO",
    "52": "Error en diferencias",
    "56": "Establecimiento cerrado",
    "57": "Autorización suspendida",
    "58": "Error en la estructura de clave acceso / ESTABLECIMIENTO CERRADO",
    "60": "AMBIENTE INCORRECTO",
    "63": "RUC clausurado",
    "65": "Fecha de emisión extemporánea",
    "67": "Fecha inválida",
    "70": "Clave de acceso en procesamiento",
    "82": "ERROR EN LA FECHA DE INICIO DE TRANSPORTE",
    "99": "ERROR AL CONSULTAR DATOS DEL SERVICIO WEB",
    "3000": "ERROR_FORMATO"
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
                const match = xmlString.match(/MOCK_ERR_(\d+)/);
                if (match) {
                    const errCode = match[1];
                    const errDesc = SRI_ERRORS[errCode] || "Error simulado de Recepcion";
                    callback({
                        RespuestaRecepcionComprobante: {
                            estado: 'DEVUELTA',
                            comprobantes: {
                                comprobante: [{
                                    mensajes: {
                                        mensaje: [{
                                            identificador: errCode,
                                            mensaje: errDesc,
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

                // Check if clave contains 99900 followed by an error code (2-4 digits)
                const claveMatch = clave.match(/99900(\d{2,4})/);
                if (claveMatch) {
                    const errCode = claveMatch[1];
                    const errDesc = SRI_ERRORS[errCode] || "Error simulado de Autorizacion";
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
                                            mensaje: errDesc,
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
