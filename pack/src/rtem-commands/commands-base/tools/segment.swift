// Person segmentation with Apple Vision. usage: swift segment.swift <inDir> <outDir> [width height]
// Writes m_XXXX.png (white RGB, alpha = person matte) for every f_XXXX.jpg in inDir.
import Foundation
import Vision
import CoreImage
import ImageIO
import UniformTypeIdentifiers

let args = CommandLine.arguments
let inDir = URL(fileURLWithPath: args[1]), outDir = URL(fileURLWithPath: args[2])
let W = args.count > 3 ? Int(args[3])! : 540, H = args.count > 4 ? Int(args[4])! : 960
try? FileManager.default.createDirectory(at: outDir, withIntermediateDirectories: true)
let files = try FileManager.default.contentsOfDirectory(atPath: inDir.path).filter { $0.hasPrefix("f_") && $0.hasSuffix(".jpg") }.sorted()
let ctx = CIContext()
let cs = CGColorSpaceCreateDeviceRGB()
for (i, name) in files.enumerated() {
    let url = inDir.appendingPathComponent(name)
    guard let src = CGImageSourceCreateWithURL(url as CFURL, nil), let img = CGImageSourceCreateImageAtIndex(src, 0, nil) else { continue }
    let req = VNGeneratePersonSegmentationRequest()
    req.qualityLevel = .accurate
    req.outputPixelFormat = kCVPixelFormatType_OneComponent8
    let handler = VNImageRequestHandler(cgImage: img, options: [:])
    try handler.perform([req])
    guard let buf = req.results?.first?.pixelBuffer else { continue }
    var mask = CIImage(cvPixelBuffer: buf)
    mask = mask.transformed(by: CGAffineTransform(scaleX: CGFloat(W) / mask.extent.width, y: CGFloat(H) / mask.extent.height))
    // white image with alpha = mask
    let white = CIImage(color: .white).cropped(to: CGRect(x: 0, y: 0, width: W, height: H))
    let clear = CIImage(color: .clear).cropped(to: CGRect(x: 0, y: 0, width: W, height: H))
    let out = white.applyingFilter("CIBlendWithMask", parameters: ["inputBackgroundImage": clear, "inputMaskImage": mask])
    let outURL = outDir.appendingPathComponent(name.replacingOccurrences(of: "f_", with: "m_").replacingOccurrences(of: ".jpg", with: ".png"))
    try ctx.writePNGRepresentation(of: out, to: outURL, format: .RGBA8, colorSpace: cs)
    if i % 50 == 0 { print("\(i)/\(files.count)") }
}
print("done \(files.count)")
