/**
 * Test script for SRI Mock Server
 */
const soap = require('soap');

const RECEPCION_URL = 'http://localhost:8080/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl';
const AUTORIZACION_URL = 'http://localhost:8080/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl';

async function test() {
    console.log('--- TESTING SRI MOCK SERVER ---');

    try {
        // Test Recepcion
        console.log('\nTesting RecepcionComprobantesOffline...');
        const clientRecepcion = await soap.createClientAsync(RECEPCION_URL);
        const [resultRecepcion] = await clientRecepcion.validarComprobanteAsync({ xml: Buffer.from('<xml></xml>').toString('base64') });
        console.log('Result:', JSON.stringify(resultRecepcion, null, 2));

        // Test Autorizacion
        console.log('\nTesting AutorizacionComprobantesOffline...');
        const clientAutorizacion = await soap.createClientAsync(AUTORIZACION_URL);
        const [resultAutorizacion] = await clientAutorizacion.autorizacionComprobanteAsync({ claveAccesoComprobante: '1234567890123456789012345678901234567890123456789' });
        console.log('Result:', JSON.stringify(resultAutorizacion, null, 2));

        console.log('\nSUCCESS: Both endpoints are working correctly.');
    } catch (err) {
        console.error('\nERROR:', err.message);
        process.exit(1);
    }
}

test();
