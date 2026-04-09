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

        // Test Recepcion Error Simulation (Error 35)
        console.log('\nTesting Recepcion Error Simulation (Error 35) - MOCK_ERR_35...');
        const xmlError = '<xml><!-- MOCK_ERR_35 --></xml>';
        const [resultRecepcionError] = await clientRecepcion.validarComprobanteAsync({ xml: Buffer.from(xmlError).toString('base64') });
        console.log('Result Error:', JSON.stringify(resultRecepcionError, null, 2));

        // Test Recepcion Error Simulation (Error 70 - Clave en procesamiento)
        console.log('\nTesting Recepcion Error Simulation (Error 70) - MOCK_ERR_70...');
        const xmlError70 = '<xml><!-- MOCK_ERR_70 --></xml>';
        const [resultRecepcionError70] = await clientRecepcion.validarComprobanteAsync({ xml: Buffer.from(xmlError70).toString('base64') });
        console.log('Result Error 70:', JSON.stringify(resultRecepcionError70, null, 2));

        // Test Autorizacion
        console.log('\nTesting AutorizacionComprobantesOffline...');
        const clientAutorizacion = await soap.createClientAsync(AUTORIZACION_URL);
        const [resultAutorizacion] = await clientAutorizacion.autorizacionComprobanteAsync({ claveAccesoComprobante: '1234567890123456789012345678901234567890123456789' });
        console.log('Result:', JSON.stringify(resultAutorizacion, null, 2));

        // Test Autorizacion Error Simulation (Error 57)
        console.log('\nTesting Autorizacion Error Simulation (Error 57) - 9990057...');
        const [resultAutorizacionError] = await clientAutorizacion.autorizacionComprobanteAsync({ claveAccesoComprobante: '1234567890123456789012345678901234567899900570123' });
        console.log('Result Error:', JSON.stringify(resultAutorizacionError, null, 2));

        console.log('\nSUCCESS: Both endpoints are working correctly with error simulation.');
    } catch (err) {
        if (err.code === 'ECONNREFUSED') {
            console.error('\nERROR: No se pudo conectar al Mock Server (ECONNREFUSED).');
            console.error('¡Asegúrate de ejecutar "node index.js" en otra terminal antes de correr "node test.js"!');
        } else {
            console.error('\nERROR:', err.message || err);
        }
        process.exit(1);
    }
}

test();
