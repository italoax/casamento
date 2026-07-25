/**
 * Instância única do sharp com os decodificadores de risco desativados.
 *
 * As falhas corrigidas no libvips 8.18.3 (advisory do sharp, CWE-1395) ficam
 * nos loaders de GIF, TIFF e do formato nativo .vips. O site só processa fotos
 * de celular (JPEG/PNG/HEIC/WebP), então bloqueamos esses três loaders como
 * defesa em profundidade: mesmo que surja uma nova falha neles, o upload de
 * terceiros (fotos da festa) não a alcança. `sharp.block` vale para o processo
 * inteiro, por isso é aplicado aqui uma vez e reexportado.
 */
import sharp from "sharp";

sharp.block({ operation: ["VipsForeignLoadNsgif", "VipsForeignLoadTiff", "VipsForeignLoadVips"] });

export default sharp;
