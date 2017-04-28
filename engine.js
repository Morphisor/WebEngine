//<reference path="babylon.math.ts"/>
var Camera = (function () {
    function Camera() {
        this.Position = BABYLON.Vector3.Zero();
        this.Target = BABYLON.Vector3.Zero();
    }
    return Camera;
}());
var Mesh = (function () {
    function Mesh(name, verticesCount) {
        this.name = name;
        this.Vertices = new Array(verticesCount);
        this.Rotation = BABYLON.Vector3.Zero();
        this.Position = BABYLON.Vector3.Zero();
    }
    return Mesh;
}());
var Renderer = (function () {
    function Renderer(canvas) {
        this.workingCanvas = canvas;
        this.workingWidth = canvas.width;
        this.workingHeight = canvas.height;
        this.workingContext = this.workingCanvas.getContext("2d");
    }
    Renderer.prototype.clear = function () {
        this.workingContext.clearRect(0, 0, this.workingWidth, this.workingHeight);
        this.backbuffer = this.workingContext.getImageData(0, 0, this.workingWidth, this.workingHeight);
    };
    Renderer.prototype.present = function () {
        this.workingContext.putImageData(this.backbuffer, 0, 0);
    };
    Renderer.prototype.putPixel = function (x, y, color) {
        this.backbufferdata = this.backbuffer.data;
        var index = ((x >> 0) + (y >> 0) * this.workingWidth) * 4;
        this.backbufferdata[index] = color.r * 255;
        this.backbufferdata[index + 1] = color.g * 255;
        this.backbufferdata[index + 2] = color.b * 255;
        this.backbufferdata[index + 3] = color.a * 255;
    };
    Renderer.prototype.project = function (coord, transMat) {
        var point = BABYLON.Vector3.TransformCoordinates(coord, transMat);
        var x = point.x * this.workingWidth + this.workingWidth / 2.0 >> 0;
        var y = -point.y * this.workingHeight + this.workingHeight / 2.0 >> 0;
        return (new BABYLON.Vector2(x, y));
    };
    Renderer.prototype.drawPoint = function (point) {
        if (point.x >= 0 && point.y >= 0 && point.x < this.workingWidth && point.y < this.workingHeight) {
            this.putPixel(point.x, point.y, new BABYLON.Color4(1, 1, 0, 1));
        }
    };
    Renderer.prototype.render = function (camera, meshes) {
        var viewMatrix = BABYLON.Matrix.LookAtLH(camera.Position, camera.Target, BABYLON.Vector3.Up());
        var projectionMatrix = BABYLON.Matrix.PerspectiveFovLH(0.78, this.workingWidth / this.workingHeight, 0.01, 1.0);
        for (var index = 0; index < meshes.length; index++) {
            var cMesh = meshes[index];
            var worldMatrix = BABYLON.Matrix.RotationYawPitchRoll(cMesh.Rotation.y, cMesh.Rotation.x, cMesh.Rotation.z).multiply(BABYLON.Matrix.Translation(cMesh.Position.x, cMesh.Position.y, cMesh.Position.z));
            var transformMatrix = worldMatrix.multiply(viewMatrix).multiply(projectionMatrix);
            for (var indexVertices = 0; indexVertices < cMesh.Vertices.length; indexVertices++) {
                var projectedPoint = this.project(cMesh.Vertices[indexVertices], transformMatrix);
                this.drawPoint(projectedPoint);
            }
        }
    };
    return Renderer;
}());
document.addEventListener("DOMContentLoaded", init, false);
var canvas;
var renderer;
var mesh;
var meshes = [];
var camera;
function init() {
    canvas = document.getElementById("frontBuffer");
    mesh = new Mesh("Cube", 8);
    meshes.push(mesh);
    camera = new Camera();
    renderer = new Renderer(canvas);
    mesh.Vertices[0] = new BABYLON.Vector3(-1, 1, 1);
    mesh.Vertices[1] = new BABYLON.Vector3(1, 1, 1);
    mesh.Vertices[2] = new BABYLON.Vector3(-1, -1, 1);
    mesh.Vertices[3] = new BABYLON.Vector3(-1, -1, -1);
    mesh.Vertices[4] = new BABYLON.Vector3(-1, 1, -1);
    mesh.Vertices[5] = new BABYLON.Vector3(1, 1, -1);
    mesh.Vertices[6] = new BABYLON.Vector3(1, -1, 1);
    mesh.Vertices[7] = new BABYLON.Vector3(1, -1, -1);
    camera.Position = new BABYLON.Vector3(0, 0, 10);
    camera.Target = new BABYLON.Vector3(0, 0, 0);
    requestAnimationFrame(drawingLoop);
}
function drawingLoop() {
    renderer.clear();
    mesh.Rotation.x += 0.01;
    mesh.Rotation.y += 0.01;
    renderer.render(camera, meshes);
    renderer.present();
    requestAnimationFrame(drawingLoop);
}
