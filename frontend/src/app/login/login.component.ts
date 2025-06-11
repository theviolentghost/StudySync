import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common'; 
import * as THREE from 'three';
import { AuthService } from '../auth.service';

interface SphereConfig {
    name: string;
    color: number;
    emissive?: number;
    shininess: number;
    radius: number;
    speedMultiplier: number;
    children?: string[]; // names of the config that should be used
    ring?: {
        color: number;
        innerRadius: number;
        outerRadius: number;
        width: number;
    };
}

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [
        RouterModule,
        CommonModule,
    ],
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.css']
})
export class LoginComponent implements AfterViewInit, OnDestroy {
    @ViewChild('glCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
    @ViewChild('spaceCover') revealRef!: ElementRef<HTMLDivElement>;
    private renderer!: THREE.WebGLRenderer;
    private scene!: THREE.Scene;
    private camera!: THREE.PerspectiveCamera;
    private gridMesh!: THREE.Mesh;
    private animationId: number | null = null;
    private sun!: THREE.Mesh | undefined;
    private gridPlane: THREE.PlaneGeometry | undefined;
    private starField!: THREE.Points | undefined;
    private spheres: THREE.Mesh[] = [];
    private planeMat!: THREE.ShaderMaterial;
    private sphereMap = new Map<string, SphereConfig>([
        ['sun', {
            name: 'Sun',
            color: 0xffd700,
            shininess: 100,
            radius: 10,
            speedMultiplier: 0.045,
            children: ['earth', 'moon', 'mars', 'moon']
        }],
        ['earth', {
            name: 'Earth',
            color: 0x0000ff,
            emissive: 0x500055,
            shininess: 50,
            radius: 2,
            speedMultiplier: 0.5
        }],
        ['moon', {
            name: 'Moon',
            color: 0xaaaaaa,
            shininess: 20,
            radius: 0.5,
            speedMultiplier: 1.5
        }],
        ['mars', {
            name: 'Mars',
            color: 0xff4500,
            emissive: 0x550000,
            shininess: 30,
            radius: 1.5,
            speedMultiplier: 0.3
        }],
        ['jupiter', {
            name: 'Jupiter',
            color: 0xff8c00,
            emissive: 0x552200,
            shininess: 70,
            radius: 5,
            speedMultiplier: 0.1
        }],
        ['saturn', {
            name: 'Saturn',
            color: 0xd2b48c,
            emissive: 0x665544,
            shininess: 60,
            radius: 4.5,
            speedMultiplier: 0.08,
            ring: {
                color: 0xdeb887,
                innerRadius: 8.5,
                outerRadius: 14.5,
                width: 1.2
            }
        }],
        ['uranus', {
            name: 'Uranus',
            color: 0x00ffff,
            emissive: 0x005555,
            shininess: 40,
            radius: 3.5,
            speedMultiplier: 0.06
        }],
        ['neptune', {
            name: 'Neptune',
            color: 0x00008b,
            emissive: 0x000044,
            shininess: 50,
            radius: 3.5,
            speedMultiplier: 0.05
        }]
    ]);

    constructor (private authService: AuthService, private router: Router) {}

    async login(): Promise<void> {
        const loginData = {
            email: (document.getElementById("email") as HTMLInputElement)?.value.trim() || "",
            password: (document.getElementById("password") as HTMLInputElement)?.value || "",
        };

        if(loginData.email === "") {
            return this.throwInvalidEmailError("Must Fill Out");
        }
        if(loginData.password === "") {
            return this.throwInvalidPasswordError("Must Fill Out");
        }
        if(!this.isValidEmail(loginData.email)) {
            return this.throwInvalidEmailError("Not A Valid Email");
        }
        if(!this.isValidPassword(loginData.password)) {
            return this.throwInvalidPasswordError("Must be Longer Than 3 Characters");
        }

        this.authService.login(loginData).subscribe({
            next: (response) => {
                // handle success
                console.log(response);

                this.authService.setToken(response.token);
                this.authService.setRefreshToken(response.refreshToken);

                this.router.navigate(['/user'], { replaceUrl: true });
            },
            error: (response) => {
                if(response.status === 401 || response.status === 403) {
                    // unauthorized or forbidden
                    this.throwInvalidEmailError("Invalid Email or Password");
                    this.throwInvalidPasswordError("Invalid Email or Password");
                    return;
                }
                const errorText = response.error.error;
                if(errorText === "Email already in use") {
                    return this.throwInvalidEmailError("In Use");
                }
                if(errorText === "Email and password are required") {
                    this.throwInvalidEmailError("Must Fill Out");
                    this.throwInvalidPasswordError("Must Fill Out");
                    return;
                }
                if(errorText === "Password too short") {
                    return this.throwInvalidPasswordError("Must be Longer Than 3 Characters");
                }
                

                this.throwInvalidEmailError("Internal Error");
                this.throwInvalidPasswordError("Internal Error");
            }
        });
    }

    private isValidEmail(email: string): boolean {
        return email.length > 0 && email.indexOf('@') != -1;
    }
    private isValidPassword(password: string): boolean {
        return password.length >= 4;
    }

    private throwInvalidEmailError(error: string): void {
        const formGroup = document.getElementById("email-form-group");
        formGroup?.classList.add("has-error");

        const span = formGroup?.getElementsByTagName("label")[0]?.getElementsByTagName("span")[0];
        if(!span) return;
        span.textContent = ` - ${error}`;
    }

    clearEmailError(): void {
        const formGroup = document.getElementById("email-form-group");
        formGroup?.classList.remove("has-error");

        const span = formGroup?.getElementsByTagName("label")[0]?.getElementsByTagName("span")[0];
        if(!span) return;
        span.textContent = ``;
    }

    private throwInvalidPasswordError(error: string): void {
        const formGroup = document.getElementById("password-form-group");
        formGroup?.classList.add("has-error");

        const span = formGroup?.getElementsByTagName("label")[0]?.getElementsByTagName("span")[0];
        if(!span) return;
        span.textContent = ` - ${error}`;
    }

    clearPasswordError(): void {
        const formGroup = document.getElementById("password-form-group");
        formGroup?.classList.remove("has-error");

        const span = formGroup?.getElementsByTagName("label")[0]?.getElementsByTagName("span")[0];
        if(!span) return;
        span.textContent = ``;
    }

    private resizeTimeout: any;

    ngAfterViewInit() {
        this.initializeSpaceScene();
        this.animate();

        window.addEventListener('resize', () => {
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => {
                if (this.renderer) {
                    const canvas = this.canvasRef.nativeElement;
                    this.camera.aspect = canvas.clientWidth / canvas.clientHeight;
                    this.camera.updateProjectionMatrix();
                    this.renderer.setSize(window.innerWidth, window.innerHeight);
                    // this.reposiitonStars();
                }
            }, 0);
        });
    }

    ngOnDestroy() {
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
        }
        this.renderer?.dispose();
        this.scene?.traverse((obj) => {
            if (obj instanceof THREE.Mesh) {
                obj.geometry.dispose();
                if (Array.isArray(obj.material)) {
                    obj.material.forEach((m) => m.dispose());
                } else {
                    obj.material.dispose();
                }
            }
        });
    }

    private reveal() {
        this.fadeOutCover(1300);
    }

    private fadeOutCover(duration: number = 1000) {
        const cover = this.revealRef.nativeElement;
        let opacity = 1;
        const step = 16 / duration; // assuming ~60fps
    
        function animate() {
            opacity -= step;
            if (opacity <= 0) {
                opacity = 0;
                cover.style.opacity = '0';
                cover.style.display = 'none'; // optional: hide after fade
            } else {
                cover.style.opacity = opacity.toString();
                requestAnimationFrame(animate);
            }
        }
    
        animate();
    }

    private hide() {
        this.fadeInCover(1300);
    }

    private fadeInCover(duration: number = 1000) {
        const cover = this.revealRef.nativeElement;
        cover.style.display = 'block';
        cover.style.opacity = '0';
        let opacity = 0;
        const step = 16 / duration; // assuming ~60fps
    
        function animate() {
            opacity += step;
            if (opacity >= 1) {
                opacity = 1;
                cover.style.opacity = '1';
            } else {
                cover.style.opacity = opacity.toString();
                requestAnimationFrame(animate);
            }
        }
    
        animate();
    }

    private async reposiitonStars() {
        if (!this.starField) return;

        const starGeometry = this.starField.geometry as THREE.BufferGeometry;
        const starVertices = starGeometry.attributes['position'].array as Float32Array;

        for (let i = 0; i < starVertices.length; i += 3) {
            starVertices[i] = (Math.random()) * - window.innerWidth / 1.4 - 300; // x
            starVertices[i + 1] = (Math.random() - 0.5) * 1000; // y
            starVertices[i + 2] = (Math.random()) * - window.innerWidth / 1.4 - 300; // z
        }

        starGeometry.attributes['position'].needsUpdate = true;
    }

    private async initializeSpaceScene() {
        setTimeout(this.createNewSolarSystem.bind(this), 60 * 1000);

        this.reveal();

        const canvas = this.canvasRef.nativeElement;
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(
            45,
            canvas.clientWidth / canvas.clientHeight,
            0.1,
            1550
        );
        this.camera.position.set(170, 25, 170);
        this.camera.lookAt(0, 0, 0);
        this.camera.rotateZ(Math.PI / 12);

        // Create a high resolution plane that will serve as our bendable grid.
        this.gridPlane = new THREE.PlaneGeometry(1100, 1100, 200, 200);
        this.gridPlane.userData['originalPositions'] = new Float32Array(this.gridPlane.attributes['position'].array);

        this.planeMat = new THREE.ShaderMaterial({
            transparent: true,
            uniforms: {
                sunPosition: { value: new THREE.Vector3(0, 0, 0) }
            },
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vWorldPosition;
                void main() {
                vUv = uv;
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPosition.xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                varying vec2 vUv;
                varying vec3 vWorldPosition;
                uniform vec3 sunPosition;
                void main(){
                    float gridCount = 140.0;
                    vec2 gridUV = fract(vUv * gridCount);
                    float dx = min(gridUV.x, 1.0 - gridUV.x);
                    float dy = min(gridUV.y, 1.0 - gridUV.y);
                    float lineX = smoothstep(0.0, fwidth(gridUV.x)*1.5, dx);
                    float lineY = smoothstep(0.0, fwidth(gridUV.y)*1.5, dy);
                    float gridLine = 1.0 - min(lineX, lineY);

                    // Distance-based opacity from sun position
                    float dist = length(vWorldPosition - sunPosition);
                    float opacity = clamp(1.0 - (dist / 475.0), 0.1, 1.0);

                    vec4 baseColor = vec4(vec3(0.0), 0.0);
                    vec4 lineColor = vec4(vec3(0.21), opacity);
                    gl_FragColor = mix(baseColor, lineColor, gridLine);
                }
            `,
            //side: THREE.DoubleSide,
        });

        // Use bracket notation to set the property.
        this['gridMesh'] = new THREE.Mesh(this.gridPlane, this.planeMat);
        this['gridMesh'].rotation.x = -Math.PI / 2;
        this.scene.add(this['gridMesh']);

        // Add basic lights:
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
        this.scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.01);
        directionalLight.position.set(50, 10, -12);
        this.scene.add(directionalLight);

        const starGeometry = new THREE.BufferGeometry();
        const starCount = 2000;
        const starVertices = [];

        for (let i = 0; i < starCount; i++) {
            const x = (Math.random()) * - window.innerWidth / 1.4 - 300;
            const y = (Math.random() - 0.5) * 1000;
            const z = (Math.random()) * - window.innerWidth / 1.4 - 300;
            starVertices.push(x, y, z);
        }

        starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
        const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 1.5 });
        this.starField = new THREE.Points(starGeometry, starMaterial);
        this.scene.add(this.starField);

        // 1. Create a group for the nebula
        const nebulaGroup = new THREE.Group();

        // 2. Create the nebula points as before
        const nebulaParticles = new THREE.BufferGeometry();
        const nebulaCount = 500;
        const nebulaPositions = [];
        const nebulaColors = [];

        let nebulaX = Math.random() * 400 + 300;
        let nebulaZ = Math.random() * 400 + 300;

        let color = new THREE.Color();
        color.setHSL(Math.random(), 0.8 + Math.random() * 0.2, 0.45 + Math.random() * 0.2);

        for (let i = 0; i < nebulaCount; i++) {
            const x = (Math.random()) * -150 - nebulaX;
            const y = (Math.random() - 0.5) * 1500;
            const z = (Math.random()) * -150 - nebulaZ;
            nebulaPositions.push(x, y, z);

            nebulaColors.push(color.r + Math.floor(Math.random() * 1), color.g + Math.floor(Math.random() * 1), color.b + Math.floor(Math.random() * 1));
        }

        nebulaParticles.setAttribute('position', new THREE.Float32BufferAttribute(nebulaPositions, 3));
        nebulaParticles.setAttribute('color', new THREE.Float32BufferAttribute(nebulaColors, 3));
        const nebulaMaterial = new THREE.PointsMaterial({
            size: 18,
            transparent: true,
            opacity: 0.18,
            vertexColors: true,
            depthWrite: false
        });
        const nebulaField = new THREE.Points(nebulaParticles, nebulaMaterial);

        // 3. Add nebula to the group, and group to the scene
        nebulaGroup.add(nebulaField);
        this.scene.add(nebulaGroup);

        // Create spheres/masses and add them to the scene.
        this.createSolarSystem();

        this.applyGravityToPlane();
    }

    private async createSolarSystem() {
        const allKeys = Array.from(this.sphereMap.keys()).filter(k => k !== 'sun');
        const numChildren = Math.floor(Math.random() * 8) + 3;
        const chosen = new Set<string>();

        while (chosen.size < numChildren && chosen.size < allKeys.length) {
            const idx = Math.floor(Math.random() * allKeys.length);
            chosen.add(allKeys[idx]);
        }

        const children = Array.from(chosen);

        this.sun = this.createSphere({
            name: 'Sun',
            color: 0xffd700,
            shininess: 100,
            radius: 18,
            speedMultiplier: 0.045,
            children: children
        });
        this.sun?.position.set(0, 0, 0);
        this.createSphere(this.sphereMap.get('saturn'));
        this.createSphere(this.sphereMap.get('jupiter'));
        this.createSphere(this.sphereMap.get('uranus'));
        this.createSphere(this.sphereMap.get('neptune'));
        this.createSphere(this.sphereMap.get('earth'));
        this.createSphere(this.sphereMap.get('mars'));
        this.createSphere(this.sphereMap.get('moon'));
        this.createSphere(this.sphereMap.get('moon')); // Add another moon for fun
        // this.createSphere(this.sphereMap.get('sun')); // Add another sun for fun

        this.spaceApartSpheres();
    }

    private async spaceApartSpheres() {
        const spacing = 50; // Minimum distance between spheres
        for (let i = 0; i < this.spheres.length; i++) {
            const sphereA = this.spheres[i];
            const velocityA = sphereA.userData['velocity'] as THREE.Vector3;
            for (let j = i + 1; j < this.spheres.length; j++) {
                const sphereB = this.spheres[j];
                const velocityB = sphereB.userData['velocity'] as THREE.Vector3;
                const direction = new THREE.Vector3().subVectors(sphereB.position, sphereA.position);
                const distance = direction.length();
                if (distance < spacing) {
                    const offset = direction.normalize().multiplyScalar(spacing - distance);
                    sphereB.position.add(offset);
                }
                // Check if velocities are moving toward each other
                const relativeVelocity = new THREE.Vector3().subVectors(velocityB, velocityA);
                if (relativeVelocity.dot(direction) < 0) {
                    // They are moving toward each other, so reflect velocities
                    // Project velocities onto the direction vector and reverse that component
                    const dirNorm = direction.clone().normalize();
                    const vA_proj = dirNorm.clone().multiplyScalar(velocityA.dot(dirNorm));
                    const vB_proj = dirNorm.clone().multiplyScalar(velocityB.dot(dirNorm));
                    velocityA.sub(vA_proj).add(vA_proj.negate());
                    velocityB.sub(vB_proj).add(vB_proj.negate());
                    sphereA.userData['velocity'] = velocityA;
                    sphereB.userData['velocity'] = velocityB;
                }
            }
        }
    }

    private async simulateGravityOnSpheres() {
        // just for funzies
        const G = 0.01; 
        for (let i = 0; i < this.spheres.length; i++) {
            const sphereA = this.spheres[i];
            const massA = sphereA.userData['mass'] || 1;
            const velocityA = sphereA.userData['velocity'] as THREE.Vector3;
    
            let netForce = new THREE.Vector3();
    
            for (let j = 0; j < this.spheres.length; j++) {
                if (i === j) continue;
                const sphereB = this.spheres[j];
                const massB = sphereB.userData['mass'] || 1;
    
                // Vector from A to B
                const direction = new THREE.Vector3().subVectors(sphereB.position, sphereA.position);
                const distanceSq = Math.max(direction.lengthSq(), 0.01); // Prevent division by zero
    
                // Newton's law of gravitation
                const forceMagnitude = G * (massA * massB) / distanceSq;
                const force = direction.normalize().multiplyScalar(forceMagnitude);
    
                netForce.add(force);
            }
    
            // Acceleration = F / m
            const acceleration = netForce.divideScalar(massA).clampLength(0, 0.01); // Limit acceleration to prevent excessive speed
    
            // Update velocity
            velocityA.add(acceleration);
    
            // Update position based on velocity
            sphereA.position.add(velocityA);
        }
    }

    private async updateSpheres() {
        for (let sphere of this.spheres) {
            if (sphere.userData['isChild']) {
                const orbitRadius = sphere.userData['orbitRadius'];
                const angularVelocity = sphere.userData['angularVelocity'];
                let orbitAngle = sphere.userData['orbitAngle'];
                const orbitObject = sphere.userData['orbitObject'];
                const axis = sphere.userData['orbitAxis'] as THREE.Vector3;
        
                // Update angle
                orbitAngle += angularVelocity;
                sphere.userData['orbitAngle'] = orbitAngle;
        
                // Start at a point on the orbit circle
                const startPos = new THREE.Vector3(orbitRadius, 0, 0);
        
                // Create quaternion for rotation
                const quat = new THREE.Quaternion();
                quat.setFromAxisAngle(axis, orbitAngle);
        
                // Rotate the start position
                const rotatedPos = startPos.clone().applyQuaternion(quat);
        
                // Set sphere position relative to its parent
                sphere.position.copy(orbitObject.position.clone().add(rotatedPos));
            }
            else {
                // For non-child spheres, just update their position based on velocity
                const velocity = sphere.userData['velocity'] as THREE.Vector3;
                sphere.position.add(velocity);

                // Check for collisions with other spheres
                for (let otherSphere of this.spheres) {
                    if (sphere === otherSphere || otherSphere.userData['isChild']) continue;

                    const distance = sphere.position.distanceTo(otherSphere.position);
                    const combinedRadius = (sphere.geometry as THREE.SphereGeometry).parameters.radius + (otherSphere.geometry as THREE.SphereGeometry).parameters.radius;

                    if (distance < combinedRadius) {
                        // Simple collision response: reverse velocity
                        velocity.multiplyScalar(-1);
                        sphere.userData['velocity'] = velocity;
                    }
                }
            }
        }
        if(this.sun) {
            this.planeMat.uniforms['sunPosition'].value.copy(this.sun.position);
            this.camera.position.lerp(this.sun.position.clone().add(new THREE.Vector3(200, 45, 270)), 0.01);
            // this.gridMesh.position.lerp(this.sun.position.clone().add(new THREE.Vector3(0, 0, 0)), 0.001);
            // this.starField?.position.set(this.sun.position.x, this.sun.position.y, this.sun.position.z);
        }
    }

    private createSphere(configuration: SphereConfig | undefined): THREE.Mesh | undefined {
        if(!configuration) return;

        const sphereGeo = new THREE.SphereGeometry(configuration.radius, 32, 32);
        const sphereMat = new THREE.MeshPhongMaterial({
            color: configuration.color,
            shininess: configuration.shininess,
            emissive: configuration.emissive || 0x000000,
        });
        const sphere = new THREE.Mesh(sphereGeo, sphereMat);
        sphere.position.set((Math.random() - 0.5) * 500, .55, (Math.random() - 0.5) * 500);
        sphere.userData['mass'] = (Math.random() * .5 + 1) * configuration.radius;
        sphere.userData['velocity'] = new THREE.Vector3(Math.random(), 0, Math.random()).multiplyScalar(configuration.speedMultiplier);
        sphere.userData['children'] = configuration.children?.map((child) => this.createChildSphere(sphere, this.sphereMap.get(child))) || [];
        this.scene.add(sphere);
        this.spheres.push(sphere);

        if(configuration.ring) {
            const ringGeo = new THREE.RingGeometry(
                configuration.ring.innerRadius,
                configuration.ring.outerRadius,
                64
            );
            const ringMat = new THREE.MeshPhongMaterial({
                color: configuration.ring.color,
                side: THREE.DoubleSide,
                // transparent: true,
                // opacity: 1
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = Math.PI / 2 + Math.random() * .25; // Rotate to lie flat
            sphere.add(ring);
        }

        return sphere;
    }

    private createChildSphere(parent: THREE.Mesh, configuration: SphereConfig | undefined): THREE.Mesh | undefined {
        if (!configuration) return undefined;

        const sphereGeo = new THREE.SphereGeometry(configuration.radius, 32, 32);
        const sphereMat = new THREE.MeshPhongMaterial({
            color: configuration.color,
            shininess: configuration.shininess,
            emissive: configuration.emissive || 0x000000,
        });
        const velocity = new THREE.Vector3(
            (Math.random() - 0.5),
            0,
            (Math.random() - 0.5)
        ).multiplyScalar(configuration.speedMultiplier * 0.3);
        const radius = configuration.radius;
        const mass = (Math.random() * 15 + 1) * radius;

        // based on: velocity, radius, mass calculate orbiting radius and angular velocity

        const G = 1; // Gravitational constant
        const parentMass = parent.userData['mass'] || 1;
        const v = velocity.length();
        const orbitRadius = Math.max(((parent.geometry as THREE.SphereGeometry).parameters.radius), Math.min(65, (G * parentMass) / (v * v)));

        const sphere = new THREE.Mesh(sphereGeo, sphereMat);
        sphere.position.set(
            (Math.random() - 0.5) * 50,
            0,
            (Math.random() - 0.5) * 50
        );
        sphere.userData['isChild'] = true;
        sphere.userData['mass'] = mass;
        sphere.userData['velocity'] = velocity;
        sphere.userData['children'] = configuration.children?.map((child) => this.createChildSphere(sphere, this.sphereMap.get(child))) || [];
        sphere.userData['orbitRadius'] = orbitRadius;
        sphere.userData['angularVelocity'] = v / orbitRadius;
        sphere.userData['orbitAngle'] = Math.random() * Math.PI * 2; // Random initial angle for orbiting
        const axis = new THREE.Vector3(
            (Math.random() - 0.5) * 0.5, // small tilt in X
             1 - ((Math.random()) * 0.2),
            (Math.random() - 0.5) * 0.5  // small tilt in Z
          ).normalize();
          sphere.userData['orbitAxis'] = axis;

        sphere.userData['orbitAxis'] = axis;
        sphere.userData['orbitAxis'] = axis;
        sphere.userData['orbitObject'] = parent;

        if(configuration.ring) {
            const ringGeo = new THREE.RingGeometry(
                configuration.ring.innerRadius,
                configuration.ring.outerRadius,
                64
            );
            const ringMat = new THREE.MeshPhongMaterial({
                color: configuration.ring.color,
                side: THREE.DoubleSide,
                // transparent: true,
                // opacity: 0.5
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = Math.PI / 2 + Math.random() * .25; // Rotate to lie flat
            sphere.add(ring);
        }

        this.scene.add(sphere);
        this.spheres.push(sphere);

        return sphere;
    }

    private animate = async () => {
        this.updateSpheres();
        this.applyGravityToPlane();

        this.renderer.render(this.scene, this.camera);
        this.animationId = requestAnimationFrame(this.animate);
    }

    private async applyGravityToPlane(): Promise<void> {
        const geometry = this['gridMesh'].geometry as THREE.PlaneGeometry;
        const positions = geometry.attributes['position'].array as Float32Array;
        const originalPositions = geometry.userData['originalPositions'] as Float32Array;
        const count = positions.length / 3;

        (geometry.attributes['position'] as THREE.BufferAttribute).needsUpdate = true;

        const clamp = ( value: number, min: number, max: number ): number => {
            return Math.max(min, Math.min(max, value));
        }

        for(let index = 0; index < count; index++) {
            const i = index * 3;
            const x = positions[i];
            const z = -positions[i + 1];
            let totalDisplacement = 0;

            // Process each sphere and sum their influence.
            for (let s = 0; s < this.spheres.length; s++) {
              const sphere = this.spheres[s];
              const sphereRadius = (sphere.geometry as THREE.SphereGeometry).parameters.radius;
              const sphereMass = sphere.userData['mass'] || 1;
              const dx = x - sphere.position.x;
              const dz = z - sphere.position.z;
              let distance = Math.sqrt(dx * dx + dz * dz);
              
              // Only contribute if within the sphere’s effective influence.
              if (distance < sphereRadius * sphereMass) {
                // The contribution is clamped and raised to a power for a non-linear effect.
                totalDisplacement += clamp((sphereRadius - (distance / sphereMass)), 0, sphereRadius) ** 1.4;
              }
            }
            // Update the vertex depth (y-coordinate in world space becomes the plane's z-axis)
            // Here we overwrite positions[i + 2] based on the originally stored depth.
            positions[i + 2] = originalPositions[i + 2] - totalDisplacement;
        }
    }

    private async createNewSolarSystem() {
        this.hide();

        setTimeout(() => {
            this.scene.traverse((obj) => {
                if (obj !== this.camera) { // Don't dispose the camera
                    this.disposeObject(obj);
                }
            });
        
            // Remove all children except the camera
            for (let i = this.scene.children.length - 1; i >= 0; i--) {
                const obj = this.scene.children[i];
                if (obj !== this.camera) {
                    this.scene.remove(obj);
                }
            }
        
            // Dispose renderer
            if (this.animationId !== null) {
                cancelAnimationFrame(this.animationId);
            }
            this.renderer.dispose();
        
            // Reset spheres array
            this.spheres = [];
        
            // Re-initialize
            this.initializeSpaceScene();
            this.animate();
        }, 1300);
    }

    private disposeObject(obj: THREE.Object3D) {
        // Recursively dispose geometries and materials
        obj.traverse((child: any) => {
            if (child.geometry) {
                child.geometry.dispose();
            }
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach((m: any) => m.dispose && m.dispose());
                } else {
                    child.material.dispose && child.material.dispose();
                }
            }
            if (child.texture) {
                child.texture.dispose();
            }
        });
    }
}