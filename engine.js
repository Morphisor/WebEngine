//<reference path="babylon.math.ts"/>
var Cacamera = (function () {
    function Cacamera() {
        this.Position = BABYLON.Vector3.Zero();
        this.Target = BABYLON.Vector3.Zero();
    }
    return Cacamera;
}());
var Mesh = (function () {
    function Mesh(name, verticesCount, facesCount) {
        this.name = name;
        this.Vertices = new Array(verticesCount);
        this.Faces = new Array(facesCount);
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
        this.depthbuffer = new Array(this.workingWidth * this.workingHeight);
    }
    Renderer.prototype.clear = function () {
        this.workingContext.clearRect(0, 0, this.workingWidth, this.workingHeight);
        this.backbuffer = this.workingContext.getImageData(0, 0, this.workingWidth, this.workingHeight);
        for (var i = 0; i < this.depthbuffer.length; i++) {
            this.depthbuffer[i] = 10000000;
        }
    };
    Renderer.prototype.present = function () {
        this.workingContext.putImageData(this.backbuffer, 0, 0);
    };
    Renderer.prototype.putPixel = function (x, y, z, color) {
        this.backbufferdata = this.backbuffer.data;
        var index = ((x >> 0) + (y >> 0) * this.workingWidth);
        var index4 = index * 4;
        if (this.depthbuffer[index] < z) {
            return;
        }
        this.depthbuffer[index] = z;
        this.backbufferdata[index4] = color.r * 255;
        this.backbufferdata[index4 + 1] = color.g * 255;
        this.backbufferdata[index4 + 2] = color.b * 255;
        this.backbufferdata[index4 + 3] = color.a * 255;
    };
    Renderer.prototype.project = function (coord, transMat) {
        var point = BABYLON.Vector3.TransformCoordinates(coord, transMat);
        var x = point.x * this.workingWidth + this.workingWidth / 2.0;
        var y = -point.y * this.workingHeight + this.workingHeight / 2.0;
        return (new BABYLON.Vector3(x, y, point.z));
    };
    Renderer.prototype.drawPoint = function (point, color) {
        if (point.x >= 0 && point.y >= 0 && point.x < this.workingWidth && point.y < this.workingHeight) {
            this.putPixel(point.x, point.y, point.z, color);
        }
    };
    Renderer.prototype.clamp = function (value, min, max) {
        if (min === void 0) { min = 0; }
        if (max === void 0) { max = 1; }
        return Math.max(min, Math.min(value, max));
    };
    Renderer.prototype.interpolate = function (min, max, gradient) {
        return min + (max - min) * this.clamp(gradient);
    };
    Renderer.prototype.processScanLine = function (y, pa, pb, pc, pd, color) {
        var gradient1 = pa.y != pb.y ? (y - pa.y) / (pb.y - pa.y) : 1;
        var gradient2 = pc.y != pd.y ? (y - pc.y) / (pd.y - pc.y) : 1;
        var sx = this.interpolate(pa.x, pb.x, gradient1) >> 0;
        var ex = this.interpolate(pc.x, pd.x, gradient2) >> 0;
        var z1 = this.interpolate(pa.z, pb.z, gradient1);
        var z2 = this.interpolate(pc.z, pd.z, gradient2);
        for (var x = sx; x < ex; x++) {
            var gradient = (x - sx) / (ex - sx);
            var z = this.interpolate(z1, z2, gradient);
            this.drawPoint(new BABYLON.Vector3(x, y, z), color);
        }
    };
    Renderer.prototype.drawTriangle = function (p1, p2, p3, color) {
        if (p1.y > p2.y) {
            var temp = p2;
            p2 = p1;
            p1 = temp;
        }
        if (p2.y > p3.y) {
            var temp = p2;
            p2 = p3;
            p3 = temp;
        }
        if (p1.y > p2.y) {
            var temp = p2;
            p2 = p1;
            p1 = temp;
        }
        var dP1P2;
        var dP1P3;
        //slope
        if (p2.y - p1.y > 0)
            dP1P2 = (p2.x - p1.x) / (p2.y - p1.y);
        else
            dP1P2 = 0;
        if (p3.y - p1.y > 0)
            dP1P3 = (p2.x - p1.x) / (p3.y - p1.y);
        else
            dP1P3 = 0;
        if (dP1P2 > dP1P3) {
            for (var y = p1.y >> 0; y <= p3.y >> 0; y++) {
                if (y < p2.y)
                    this.processScanLine(y, p1, p3, p1, p2, color);
                else
                    this.processScanLine(y, p1, p3, p2, p3, color);
            }
        }
        else {
            for (var y = p1.y >> 0; y <= p3.y >> 0; y++) {
                if (y < p2.y)
                    this.processScanLine(y, p1, p2, p1, p3, color);
                else
                    this.processScanLine(y, p2, p3, p1, p3, color);
            }
        }
    };
    Renderer.prototype.render = function (cacamera, meshes) {
        var viewMatrix = BABYLON.Matrix.LookAtLH(cacamera.Position, cacamera.Target, BABYLON.Vector3.Up());
        var projectionMatrix = BABYLON.Matrix.PerspectiveFovLH(0.78, this.workingWidth / this.workingHeight, 0.01, 1.0);
        for (var index = 0; index < meshes.length; index++) {
            var cMesh = meshes[index];
            var worldMatrix = BABYLON.Matrix.RotationYawPitchRoll(cMesh.Rotation.y, cMesh.Rotation.x, cMesh.Rotation.z).multiply(BABYLON.Matrix.Translation(cMesh.Position.x, cMesh.Position.y, cMesh.Position.z));
            var transformMatrix = worldMatrix.multiply(viewMatrix).multiply(projectionMatrix);
            for (var indexFaces = 0; indexFaces < cMesh.Faces.length; indexFaces++) {
                var currentFace = cMesh.Faces[indexFaces];
                var vertexA = cMesh.Vertices[currentFace.A];
                var vertexB = cMesh.Vertices[currentFace.B];
                var vertexC = cMesh.Vertices[currentFace.C];
                var pixelA = this.project(vertexA, transformMatrix);
                var pixelB = this.project(vertexB, transformMatrix);
                var pixelC = this.project(vertexC, transformMatrix);
                var color = 0.25 + ((indexFaces % cMesh.Faces.length) / cMesh.Faces.length) * 0.75;
                this.drawTriangle(pixelA, pixelB, pixelC, new BABYLON.Color4(color, color, color, 1));
            }
        }
    };
    Renderer.prototype.loadJsonFileAsync = function (fileName, callback) {
        var jsonObject = {};
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.open("GET", fileName, true);
        var self = this;
        xmlhttp.onreadystatechange = function () {
            if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
                jsonObject = JSON.parse(xmlhttp.responseText);
                callback(self.createMeshesFromJson(jsonObject));
            }
        };
        xmlhttp.send(null);
    };
    Renderer.prototype.createMeshesFromJson = function (jsonObject) {
        var meshes = [];
        for (var meshIndex = 0; meshIndex < jsonObject.meshes.length; meshIndex++) {
            var verticesArray = jsonObject.meshes[meshIndex].vertices;
            var indicesArray = jsonObject.meshes[meshIndex].indices;
            var uvCount = jsonObject.meshes[meshIndex].uvCount;
            var verticesStep = 1;
            switch (uvCount) {
                case 0:
                    verticesStep = 6;
                    break;
                case 1:
                    verticesStep = 8;
                    break;
                case 2:
                    verticesStep = 10;
                    break;
            }
            var verticesCount = verticesArray.length / verticesStep;
            var facesCount = indicesArray.length / 3;
            var mesh = new Mesh(jsonObject.meshes[meshIndex].name, verticesCount, facesCount);
            for (var index = 0; index < verticesCount; index++) {
                var x = verticesArray[index * verticesStep];
                var y = verticesArray[index * verticesStep + 1];
                var z = verticesArray[index * verticesStep + 2];
                mesh.Vertices[index] = new BABYLON.Vector3(x, y, z);
            }
            for (var index = 0; index < facesCount; index++) {
                var a = indicesArray[index * 3];
                var b = indicesArray[index * 3 + 1];
                var c = indicesArray[index * 3 + 2];
                mesh.Faces[index] = {
                    A: a,
                    B: b,
                    C: c
                };
            }
            var position = jsonObject.meshes[meshIndex].position;
            mesh.Position = new BABYLON.Vector3(position[0], position[1], position[2]);
            meshes.push(mesh);
        }
        return meshes;
    };
    return Renderer;
}());
document.addEventListener("DOMContentLoaded", init, false);
var canvas;
var renderer;
var mesh;
var meshes = [];
var camera;
document.addEventListener("DOMContentLoaded", init, false);
function init() {
    canvas = document.getElementById("frontBuffer");
    camera = new Cacamera();
    renderer = new Renderer(canvas);
    camera.Position = new BABYLON.Vector3(0, 0, 10);
    camera.Target = new BABYLON.Vector3(0, 0, 0);
    renderer.loadJsonFileAsync("monkey.json", loadJsonCompleted);
}
function loadJsonCompleted(meshesLoaded) {
    meshes = meshesLoaded;
    requestAnimationFrame(drawingLoop);
}
function drawingLoop() {
    renderer.clear();
    for (var i = 0; i < meshes.length; i++) {
        //meshes[i].Rotation.x += 0.01;
        meshes[i].Rotation.y += 0.01;
    }
    renderer.render(camera, meshes);
    renderer.present();
    requestAnimationFrame(drawingLoop);
}
