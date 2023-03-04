import P5 from 'p5';
import Interval from '../interval';
import Explosion from './explosion';
import Patatoid from './patatoid';
import Ship from './ship';
import Ufo from './ufo';

const VARIABILITY_IN_CREATING_UFOS = 5000;
const ASTEROID_MIN_DISTANCE_TO_CENTER = 250;
const DIAMETER_MIN = 40;
const DIAMETER_MAX = 120;
const SIDES_MIN = 8;
const SIDES_MAX = 20;

export default class SpritesManager {
    private p5: P5;
    private asteroids: Patatoid[] = [];
    private ship: Ship | null;
    private shipFragments: Patatoid[] = [];
    private ufos: Ufo[] = [];
    private explosions: Explosion[] = [];
    private createUfoInterval: Interval | null;
    private ufoShootFrequency: number = 0;

    countAsteroidsHit;
    countUfosHit;

    constructor(p5: P5) {
        this.p5 = p5;
    }

    update() {
        if (this.ship) {
            this.ship.update();
        } else {
            for (const shipFragment of this.shipFragments) {
                shipFragment.update();
            }
        }

        let newAsteroids: Patatoid[] = [];

        this.asteroids = this.asteroids.filter((asteroid) => {
            asteroid.update();

            if (this.ship) {
                if (this.ship.lasersHit(asteroid)) {
                    const asteroids = asteroid.breakUp();

                    if (asteroids.length > 0) {
                        newAsteroids = [...newAsteroids, ...asteroids];
                    } else {
                        this.explosions.push(
                            new Explosion(this.p5, asteroid.position.copy())
                        );
                    }

                    this.countAsteroidsHit++;

                    return false;
                }

                if (this.ship.collideWith(asteroid)) {
                    this.shipFragments = this.ship.breakUp();
                    this.ship = null;
                }
            }

            return true;
        });

        this.asteroids = [...this.asteroids, ...newAsteroids];

        this.ufos = this.ufos.filter((ufo) => {
            ufo.update(this.ship?.position.copy());

            if (this.ship) {
                if (this.ship.lasersHit(ufo)) {
                    this.countUfosHit++;

                    this.explosions.push(
                        new Explosion(this.p5, ufo.position.copy())
                    );

                    return false;
                }

                if (this.ship.collideWith(ufo) || ufo.lasersHit(this.ship)) {
                    this.shipFragments = this.ship.breakUp();
                    this.ship = null;
                }
            }

            return true;
        });

        if (this.createUfoInterval?.isElapsed()) {
            this.createUfo(this.ufoShootFrequency);
        }

        this.explosions = this.explosions.filter((explosion) =>
            explosion.update()
        );
    }

    draw() {
        for (const explosion of this.explosions) {
            explosion.draw();
        }

        if (this.ship) {
            this.ship.draw();
        }

        for (const asteroid of this.asteroids) {
            asteroid.draw();
        }

        for (const ufo of this.ufos) {
            ufo.draw();
        }

        for (const shipFragment of this.shipFragments) {
            shipFragment.draw();
        }
    }

    startLevel(
        countAsteroids: number,
        ufoCreateFrequency: number,
        ufoShootFrequency: number
    ) {
        this.ufoShootFrequency = ufoShootFrequency;

        this.reset();

        this.ship = new Ship(
            this.p5,
            new P5.Vector(this.p5.width / 2, this.p5.height / 2),
            false
        );

        this.createAsteroids(countAsteroids);

        this.createUfoInterval = new Interval(
            this.p5.random(
                ufoCreateFrequency - VARIABILITY_IN_CREATING_UFOS,
                ufoCreateFrequency + VARIABILITY_IN_CREATING_UFOS
            )
        );
    }

    stopLevel() {
        this.createUfoInterval = null;
        this.ufoShootFrequency = 0;
        this.ufos = [];
    }

    createAsteroids(count: number) {
        this.asteroids = [];

        for (let counter = 0; counter < count; counter++) {
            const position = new P5.Vector(
                this.p5.random(this.p5.width),
                this.p5.random(this.p5.height)
            );

            // As the position is randomly chosen, make sure that the asteroid is not
            // placed too close from the center of the screen... where the ship will be.
            const middle = new P5.Vector(this.p5.width / 2, this.p5.height / 2);
            const distanceToCenter = P5.Vector.sub(position, middle);

            if (distanceToCenter.mag() < ASTEROID_MIN_DISTANCE_TO_CENTER) {
                position.setMag(ASTEROID_MIN_DISTANCE_TO_CENTER);
            }

            const diameter = this.p5.random(DIAMETER_MIN, DIAMETER_MAX);
            const rotationStep = this.p5.map(
                this.p5.random(1),
                0,
                1,
                -0.01,
                0.01
            );
            const sides = this.p5.floor(this.p5.random(SIDES_MIN, SIDES_MAX));

            this.asteroids.push(
                new Patatoid(
                    this.p5,
                    position,
                    diameter,
                    P5.Vector.random2D(),
                    rotationStep,
                    sides
                )
            );
        }
    }

    createUfo(ufoShootFrequency: number) {
        const randomSide = this.p5.floor(this.p5.random(4));
        const vector = P5.Vector.random2D();

        switch (randomSide) {
            case 1:
                vector.x += this.p5.width;
                break;
            case 2:
                vector.x -= this.p5.width;
                break;
            case 3:
                vector.y += this.p5.height;
                break;
            case 4:
                vector.y -= this.p5.height;
                break;
        }

        const ufo = new Ufo(this.p5, vector, ufoShootFrequency);
        this.ufos.push(ufo);
    }

    getAsteroidsCount(): number {
        return this.asteroids.length;
    }

    getUfosCount() {
        return this.ufos.length;
    }

    keyPressed(keyCode: number) {
        if (this.ship) {
            switch (keyCode) {
                case this.p5.LEFT_ARROW:
                    this.ship.setRotation(-0.1);
                    break;
                case this.p5.RIGHT_ARROW:
                    this.ship.setRotation(0.1);
                    break;
                case this.p5.UP_ARROW:
                    this.ship.setBoost(true);
                    break;
                case 32: // SPACE
                    this.ship.shoot();
                    break;
            }
        }
    }

    keyReleased(keyCode: number) {
        if (this.ship) {
            if (keyCode == this.p5.UP_ARROW) {
                this.ship.setBoost(false);
            } else if (
                keyCode == this.p5.LEFT_ARROW ||
                keyCode == this.p5.RIGHT_ARROW
            ) {
                this.ship.setRotation(0);
            }
        }
    }

    shipHit(): boolean {
        return this.ship === null;
    }

    reset() {
        this.asteroids = [];
        this.shipFragments = [];
        this.ufos = [];
        this.countAsteroidsHit = 0;
        this.countUfosHit = 0;
    }

    pause() {
        this.createUfoInterval?.pause();

        for (const ufo of this.ufos) {
            ufo.pause();
        }
    }

    unpause() {
        this.createUfoInterval?.unpause();

        for (const ufo of this.ufos) {
            ufo.unpause();
        }
    }
}
