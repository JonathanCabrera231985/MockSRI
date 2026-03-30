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

// SRI Recepcion Service Logic
const recepcionService = {
    RecepcionComprobantesOfflineService: {
        RecepcionComprobantesOfflinePort: {
            validarComprobante: (args, callback) => {
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

                callback({
                    RespuestaAutorizacionComprobante: {
                        claveAccesoConsultada: args.claveAccesoComprobante || '0'.repeat(49),
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
