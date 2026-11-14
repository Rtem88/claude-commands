// Face boxes with Apple Vision. usage: ./faces <inDir> <out.json>
// Writes {"f_0001": [x, y, w, h] | null, ...} in top-left pixel coords of each f_XXXX.jpg.
import Foundation
import Vision
import ImageIO

let args = CommandLine.arguments
let inDir = URL(fileURLWithPath: args[1])
let files = try FileManager.default.contentsOfDirectory(atPath: inDir.path).filter { $0.hasPrefix("f_") && $0.hasSuffix(".jpg") }.sorted()
var out: [String: Any] = [:]
for name in files {
    let url = inDir.appendingPathComponent(name)
    guard let src = CGImageSourceCreateWithURL(url as CFURL, nil), let img = CGImageSourceCreateImageAtIndex(src, 0, nil) else { continue }
    let W = Double(img.width), H = Double(img.height)
    let req = VNDetectFaceRectanglesRequest()
    try VNImageRequestHandler(cgImage: img, options: [:]).perform([req])
    let key = String(name.dropLast(4))
    if let f = (req.results ?? []).max(by: { $0.boundingBox.width < $1.boundingBox.width }) {
        let b = f.boundingBox
        out[key] = [b.minX * W, (1 - b.maxY) * H, b.width * W, b.height * H].map { ($0 * 10).rounded() / 10 }
    } else { out[key] = NSNull() }
}
let data = try JSONSerialization.data(withJSONObject: out, options: [.sortedKeys])
try data.write(to: URL(fileURLWithPath: args[2]))
print("done \(files.count)")
