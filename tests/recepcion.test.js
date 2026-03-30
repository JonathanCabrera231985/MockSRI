const { expect } = require('chai');
const { recepcionService } = require('../index');

describe('RecepcionComprobantesOffline Service Unit Tests', () => {
    const port = recepcionService.RecepcionComprobantesOfflineService.RecepcionComprobantesOfflinePort;

    it('should return "RECIBIDA" status invariably', (done) => {
        port.validarComprobante({ xml: 'MDIwMzIw...' }, (result) => {
            expect(result).to.have.property('RespuestaRecepcionComprobante');
            expect(result.RespuestaRecepcionComprobante.estado).to.equal('RECIBIDA');
            expect(result.RespuestaRecepcionComprobante.comprobantes).to.be.an('array');
            done();
        });
    });
});
