const { expect } = require('chai');
const { autorizacionService } = require('../index');

describe('AutorizacionComprobantesOffline Service Unit Tests', () => {
    const port = autorizacionService.AutorizacionComprobantesOfflineService.AutorizacionComprobantesOfflinePort;

    it('should return "AUTORIZADO" status and 37-digit authorization number', (done) => {
        const mockClave = '1234567890123456789012345678901234567890123456789';
        port.autorizacionComprobante({ claveAccesoComprobante: mockClave }, (result) => {
            expect(result).to.have.property('RespuestaAutorizacionComprobante');

            const resp = result.RespuestaAutorizacionComprobante;
            expect(resp.claveAccesoConsultada).to.equal(mockClave);
            expect(resp.autorizaciones.autorizacion).to.be.an('array').with.lengthOf(1);

            const auth = resp.autorizaciones.autorizacion[0];
            expect(auth.estado).to.equal('AUTORIZADO');
            expect(auth.numeroAutorizacion).to.equal('1234567890123456789012345678901234567');
            expect(auth.numeroAutorizacion).to.have.lengthOf(37);
            expect(auth.ambiente).to.equal('PRUEBAS');
            done();
        });
    });

    it('should handle missing claveAccesoComprobante with a fallback', (done) => {
        port.autorizacionComprobante({}, (result) => {
            const resp = result.RespuestaAutorizacionComprobante;
            expect(resp.claveAccesoConsultada).to.be.a('string');
            done();
        });
    });
});
