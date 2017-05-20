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
    Renderer.prototype.drawLine = function (point0, point1) {
        var dist = point1.subtract(point0).length();
        if (dist < 2)
            return;
        var middlePoint = point0.add((point1.subtract(point0)).scale(0.5));
        this.drawPoint(middlePoint);
        this.drawLine(point0, middlePoint);
        this.drawLine(middlePoint, point1);
    };
    Renderer.prototype.drawBline = function (point0, point1) {
        var x0 = point0.x >> 0;
        var y0 = point0.y >> 0;
        var x1 = point1.x >> 0;
        var y1 = point1.y >> 0;
        var dx = Math.abs(x1 - x0);
        var dy = Math.abs(y1 - y0);
        var sx = (x0 < x1) ? 1 : -1;
        var sy = (y0 < y1) ? 1 : -1;
        var err = dx - dy;
        while (true) {
            this.drawPoint(new BABYLON.Vector2(x0, y0));
            if ((x0 == x1) && (y0 == y1))
                break;
            var e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x0 += sx;
            }
            if (e2 < dx) {
                err += dx;
                y0 += sy;
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
                this.drawBline(pixelA, pixelB);
                this.drawBline(pixelB, pixelC);
                this.drawBline(pixelC, pixelA);
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
        meshes[i].Rotation.x += 0.01;
        meshes[i].Rotation.y += 0.01;
    }
    renderer.render(camera, meshes);
    renderer.present();
    requestAnimationFrame(drawingLoop);
}
