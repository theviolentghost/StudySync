import { Component, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  trigger, 
  state, 
  style, 
  transition, 
  animate,
} from '@angular/animations';

import { MusicMediaService, Song_Data, DownloadQuality, Song_Playlist, Song_Source } from '../../music.media.service';
import { MusicPlayerService } from '../../music.player.service';
import { PlaylistsService } from '../../playlists.service';
import { HotActionComponent } from '../hot.action/hot.action.component';
import { HotActionService } from '../../hot.action.service';
import { QuickActionComponent } from '../quick.action/quick.action.component';
import { QuickActionService } from '../../quick.action.service';

@Component({
  selector: 'media-player',
  imports: [CommonModule, HotActionComponent, QuickActionComponent],
  templateUrl: './media.player.component.html',
  styleUrl: './media.player.component.css',
  animations: [
    trigger('playerState', [
      state('hidden', style({
        height: '0',
        opacity: 0
      })),
      state('reduced', style({
        height: 'var(--space-7)',
        opacity: 1
      })),
      state('visible', style({
        height: '100%',
        opacity: 1
      })),
      state('dragging', style({
        height: '{{calculatedHeight}}px',
        opacity: 1
      }), { params: { calculatedHeight: 500 } }),
      
      // Transitions
      transition('hidden => visible', [
        animate('700ms cubic-bezier(0.25, 0.8, 0.25, 1)')
      ]),
      transition('visible => hidden', [
        animate('700ms cubic-bezier(0.25, 0.8, 0.25, 1)')
      ]),
      transition('visible => reduced', [
        animate('700ms cubic-bezier(0.25, 0.8, 0.25, 1)')
      ]),
      transition('reduced => visible', [
        animate('700ms cubic-bezier(0.25, 0.8, 0.25, 1)')
      ]),
      transition('* => dragging', [
        animate('0ms') // Instant for dragging
      ]),
      transition('dragging => *', [
        animate('400ms cubic-bezier(0.25, 0.8, 0.25, 1)')
      ])
    ]),
    
    // Content animations
    trigger('contentFade', [
      state('visible', style({ opacity: 1, transform: 'scale(1)' })),
      state('reduced', style({ opacity: 0.8, transform: 'scale(0.95)' })),
      state('hidden', style({ opacity: 0, transform: 'scale(0.9)' })),
      transition('* <=> *', animate('200ms ease-out'))
    ])
  ]
})
export class MediaPlayerComponent implements AfterViewInit {
    @ViewChild('playerContainer', { static: false }) playerContainer!: ElementRef<HTMLElement>;
    @ViewChild('media', { static: false }) mediaContainer!: ElementRef<HTMLElement>;

    _visibility_status: 'visible' | 'reduced' | 'hidden' = 'hidden';

    set _isibility_status(status: 'visible' | 'reduced' | 'hidden') {
        this._visibility_status = status;
        if (status === 'hidden') {
            this.dragOffset = 0; // Reset drag offset when hiding
            this.animationState = 'hidden';
        } else if (status === 'reduced') {
            this.animationState = 'reduced';
        } else {
            this.animationState = 'visible';
        }
    }
    get visibility_status(): 'visible' | 'reduced' | 'hidden' {
        return this._visibility_status;
    }
    buffered_percent = 0;
    buffer_like = false;
    buffer_like_clicked = false;

    // Drag properties
    private isDragging = false;
    private startY = 0;
    private currentDragOffset = 0;
    private get dragThreshold(): number {
        return window.innerHeight * 0.65; // 65% of the viewport height
    }
    private get window_height(): number {
        return window.innerHeight;
    }
    private velocityThreshold = 8;
    private lastTouchTime = 0;
    private lastTouchY = 0;

    // Animation state
    animationState: 'visible' | 'reduced' | 'hidden' | 'dragging' = 'hidden';
    dragOffset = 0;
    calculatedHeight = this.window_height; 

    get hot_action_open(): boolean {
        return this.hot_action.hot_action_open;
    }
    get hot_acction_song_data(): Song_Data | null {
        return this.hot_action.song_data;
    }
    get quick_action_open(): boolean {
        return this.quick_action.quick_action_open;
    }

    get current_song_data(): Song_Data | null {
        return this.player.song_data;
    }
    get current_media_data(): Song_Data | null {
        return this.player.media_data;
    }
    get current_playlist_data(): Song_Playlist | null {
        return this.player.playlist;
    }
    is_downloading(video_id: string): boolean {
        return this.media.is_downloading(video_id);
    }
    video_progress(video_id: string): number {
        return this.media.download_progress(video_id); // return the current download progress
    }
    audio_current_time = 0;
    audio_duration = 0;

    constructor(
        private media: MusicMediaService,
        private player: MusicPlayerService, 
        private playlists: PlaylistsService, 
        private hot_action: HotActionService,
        private quick_action: QuickActionService
    ) {
        this.player.open_player.subscribe(() => {
            this._visibility_status = 'visible';
            this.animationState = 'visible';
        });
        this.player.reduce_player.subscribe(() => {
            this._visibility_status = 'reduced';
            this.animationState = 'reduced';
        });
        this.player.track_loaded.subscribe(() => {
            if(this.player.song_data?.liked != this.buffer_like && this.buffer_like_clicked) this.toggle_like(); // sync like button state with song data after loading
            this.buffer_like = false;
            this.buffer_like_clicked = false;
        });
        this.player.song_changed.subscribe(() => {
            this.buffer_like = false; 
            this.buffer_like_clicked = false;
        });
    }

    get player_status(): 'loading' | 'playing' | 'paused' | 'stopped' {
        return this.player.player_status;
    }
    get audio_started(): boolean {
        return this.player.started_playing;
    }

    source_options: Map<Song_Source, string> = new Map([
        ['spotify', "#1cd760"],
        ['youtube', "#ff0033"],
        ['musi', "#ff8843"]
    ]);

    get_source_color(source: Song_Source | undefined): string {
        if( !source ) return 'var(--color-primary)'; // gray color for undefined sources
        return this.source_options.get(source) || 'var(--color-primary)'; // default to gray if source not found
    }

    ngAfterViewInit() {
        const audio = document.getElementById('audio') as HTMLAudioElement;
        audio.ontimeupdate = () => this.audio_current_time = audio.currentTime;
        audio.onloadedmetadata = () => this.audio_duration = audio.duration;
        audio.addEventListener('progress', () => {
            if (audio.buffered.length > 0 && audio.duration > 0) {
                const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
                this.buffered_percent = (bufferedEnd / audio.duration) * 100;
            }
        });

        this.player.audio_source_element = audio;
        this.player.thumbnail_source_element = document.getElementById('thumbnail') as HTMLImageElement;
        
        this.setupTouchListeners();
    }

    private setupTouchListeners(): void {
        if (!this.mediaContainer) return;

        const element = this.mediaContainer.nativeElement;

        // Touch start
        element.addEventListener('touchstart', (e: TouchEvent) => {
            if (this.visibility_status !== 'visible') return;
            
            this.isDragging = true;
            this.startY = e.touches[0].clientY;
            this.lastTouchTime = Date.now();
            this.lastTouchY = this.startY;
            
            // Prevent body scroll
            document.body.style.overflow = 'hidden';
        }, { passive: true });

        // Touch move
        element.addEventListener('touchmove', (e: TouchEvent) => {
            if (!this.isDragging || this.visibility_status !== 'visible') return;
            
            e.preventDefault();
            const currentY = e.touches[0].clientY;
            const deltaY = currentY - this.startY;
            
            // Only allow downward dragging
            if (deltaY > 0) {
                // Apply resistance
                this.currentDragOffset = Math.min(deltaY * 0.8, window.innerHeight * 0.85);
                this.dragOffset = this.currentDragOffset;
                this.animationState = 'dragging';

                this.calculatedHeight = Math.max(0, this.window_height - this.dragOffset); 
            }
            
            // Track velocity
            const now = Date.now();
            if (now - this.lastTouchTime > 16) { // ~60fps throttling
                this.lastTouchTime = now;
                this.lastTouchY = currentY;
            }
        }, { passive: false });

        // Touch end
        element.addEventListener('touchend', () => {
            if (!this.isDragging || this.visibility_status !== 'visible') return;
            
            this.isDragging = false;
            document.body.style.overflow = '';
            
            const velocity = this.calculateVelocity();
            const shouldReduce = this.currentDragOffset > this.dragThreshold || velocity > this.velocityThreshold - 2;
            
            if (shouldReduce) {
                this._visibility_status = 'reduced';
                this.animationState = 'reduced';
            } else {
                this.animationState = 'visible';
            }
            
            this.currentDragOffset = 0;
            // this.dragOffset = 0;
        }, { passive: true });

        // Desktop mouse support
        this.setupMouseListeners(element);
    }

    private calculateVelocity(): number {
        const timeDelta = Date.now() - this.lastTouchTime;
        if (timeDelta === 0) return 0;
        
        const distance = this.currentDragOffset;
        return distance / timeDelta;
    }

    private setupMouseListeners(element: HTMLElement): void {
        console.log('Setting up mouse listeners for media player');
        let isMouseDragging = false;
        let mouseStartY = 0;

        // Mouse down
        element.addEventListener('mousedown', (e: MouseEvent) => {
            // console.log('Mouse down on media player');
            if (this.visibility_status !== 'visible') return;
            
            isMouseDragging = true;
            mouseStartY = e.clientY;
            this.startY = e.clientY;
            this.lastTouchTime = Date.now();
            this.lastTouchY = this.startY;

            console.log('Mouse drag started at:', mouseStartY);
            
            // Prevent text selection and other mouse behaviors
            e.preventDefault();
            document.body.style.userSelect = 'none';
            document.body.style.overflow = 'hidden';
            
            // Change cursor to indicate dragging
            document.body.style.cursor = 'grabbing';
        });

        // Mouse move - attach to document to handle movement outside element
        document.addEventListener('mousemove', (e: MouseEvent) => {
            if (!isMouseDragging || this.visibility_status !== 'visible') return;
            
            const currentY = e.clientY;
            const deltaY = currentY - mouseStartY;
            
            // Only allow downward dragging
            if (deltaY > 0) {
                // Apply resistance (slightly more for mouse since it's easier to control)
                this.currentDragOffset = Math.min(deltaY * 0.8, window.innerHeight * 0.85);
                this.dragOffset = this.currentDragOffset;
                this.animationState = 'dragging';

                this.calculatedHeight = Math.max(0, this.window_height - this.dragOffset); // Update calculated height
            }

            // console.log('mouse drag - offset:', this.currentDragOffset, 'px', this.calculateVelocity());
            
            // Track velocity for mouse movements
            const now = Date.now();
            if (now - this.lastTouchTime > 16) { // ~60fps throttling
                this.lastTouchTime = now;
                this.lastTouchY = currentY;
            }
        });

        // Mouse up - attach to document to handle release outside element
        document.addEventListener('mouseup', () => {
            if (!isMouseDragging || this.visibility_status !== 'visible') return;
            
            isMouseDragging = false;
            
            // Restore body styles
            document.body.style.userSelect = '';
            document.body.style.overflow = '';
            document.body.style.cursor = '';
            
            const velocity = this.calculateVelocity();
            const shouldReduce = this.currentDragOffset > this.dragThreshold || velocity > this.velocityThreshold;

            // console.log(this.currentDragOffset)

            
            if (shouldReduce) {
                this._visibility_status = 'reduced';
                this.animationState = 'reduced';
            } else {
                this.animationState = 'visible';
            }
            
            this.currentDragOffset = 0;
            // this.dragOffset = 0;
        });

        // Handle mouse leave to prevent issues when mouse leaves window
        document.addEventListener('mouseleave', () => {
            if (isMouseDragging) {
                isMouseDragging = false;
                document.body.style.userSelect = '';
                document.body.style.overflow = '';
                document.body.style.cursor = '';
                
                // Snap back to visible when mouse leaves
                this.animationState = 'visible';
                this.currentDragOffset = 0;
                // this.dragOffset = 0;
            }
        });
    }

    // Get animation parameters - add method if not already present
    getAnimationParams() {
        return { value: this.animationState, params: { calculatedHeight: this.calculatedHeight } };
    }

    toggle_visibility(): void {
        if (this.visibility_status === 'visible') {
            this._visibility_status = 'reduced';
            this.animationState = 'reduced';
        } else if (this.visibility_status === 'reduced') {
            this._visibility_status = 'visible';
            this.animationState = 'visible';
        }
    }
    toggle_like(): void {
        this.buffer_like = !this.buffer_like; 
        this.buffer_like_clicked = true; 

        if(!this.current_song_data) return;
        this.buffer_like = false; 
        this.current_song_data.liked = !this.current_song_data?.liked;
        // this.media.save_song_to_indexDB(this.current_song_data.id.video_id, this.current_song_data);
        if(this.current_song_data.liked) {
            console.log('Adding song to favorites:', this.current_song_data);
            this.playlists.add_to_favorites(this.current_song_data);
        } else {
            this.playlists.remove_from_favorites(this.current_song_data);
        }
    }
    toggle_shuffle(): void {
        this.player.shuffle = !this.player.shuffle;
    }
    get shuffle(): boolean {
        return this.player.shuffle;
    }
    // get repeat(): number {
    //     return this.player.repeat;
    // }
    get disco_mode(): boolean {
        return this.player.disco_mode;
    }
    toggle_disco_mode(): void {
        this.player.disco_mode = !this.player.disco_mode;
    }
    toggle_play(): void {
        this.player.toggle_play();
    }
    previous(): void {
        this.player.skip_to_previous();
    }
    next(): void {
        this.player.skip_to_next();
    }
    async get_song_artwork(song: Song_Data | null): Promise<string | null> {
        if (!song) return null;
        return await this.media.get_song_artwork(song) || '';
    }
    download_song(): void {
        if (!this.current_song_data) return;
        if (this.current_song_data.downloaded) {
            console.warn('Song already downloaded');
            return;
        }
        this.media.download_audio(this.media.song_key(this.current_song_data.id), { quality: DownloadQuality.Q0, bit_rate: '128K' });
    }

    get_thumbnail_background(song: Song_Data | null): string {
        if (!song || !song.colors) return 'var(--color-background)';
        
        // Check if we have multiple colors (assuming colors.common is an array of colors)
        if (song.colors.common && Array.isArray(song.colors.common) && song.colors.common.length > 1) {
            const colors = song.colors.common;
            
            // Different gradient styles based on number of colors
            switch (colors.length) {
                case 2:
                    // Simple diagonal gradient
                    return `linear-gradient(120deg, ${colors[0]} 0%, ${colors[1]} 100%)`;
                    
                case 3:
                    // Three-color diagonal gradient
                    return `linear-gradient(120deg, ${colors[0]} 0%, ${colors[1]} 50%, ${colors[2]} 100%)`;
                    
                case 4:
                    // Radial gradient from center
                    return `radial-gradient(ellipse at center, ${colors[0]} 0%, ${colors[1]} 30%, ${colors[2]} 70%, ${colors[3]} 100%)`;
                    
                case 5:
                    // Complex multi-stop gradient
                    return `linear-gradient(120deg, ${colors[0]} 0%, ${colors[1]} 15%, ${colors[2]} 50%, ${colors[3]} 85%, ${colors[4]} 100%)`;
                    
                default:
                    if (colors.length > 5) {
                        // For many colors, create a conic gradient (circular rainbow effect)
                        const colorStops = colors.map((color, index) => 
                            `${color} ${(index * 360) / colors.length}deg`
                        ).join(', ');
                        return `conic-gradient(from 0deg, ${colorStops})`;
                    } else {
                        // Fallback for edge cases
                        return `linear-gradient(120deg, ${colors[0]} 0%, ${colors[colors.length - 1]} 100%)`;
                    }
            }
        }
        
        // Fallback to primary color with subtle gradient
        if (song.colors.primary) {
            return `linear-gradient(120deg, ${song.colors.primary} 0%, rgba(255, 255, 255, 0.1) 100%)`;
        }
        
        // Final fallback
        return 'var(--color-background)';
    }

    add_song_to_playlist(): void {
        this.hot_action.open_hot_action(this.player.song_data, this.player.song_data?.id.source || 'youtube', 'add_to_playlist');
    }

    open_queue_management(): void {
        this.quick_action.quick_action_open = true;
        this.quick_action.action = 'queue_management';
    }

    on_seek(event: any): void {
        this.player.seek_to(event.target.value);
    }
}
