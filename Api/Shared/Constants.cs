namespace Shared
{
    public static class Constants
    {
        public const string FinalVideoFileName = "final.mp4";
        public const string IntroFileName = "intro.mp4";
        public const string OutroFileName = "outro.mp4";
        public const string TransitionFileName = "transition.mp4";
        public const string ResourceContainer = "intro";
        public const string UnprocessedContainer = "unprocessed";
        public const string FinalVideoProcessingContainer = "final-video-processing-requests";


        public static class VideoTypes
        {
            public static string ActionShot = nameof(ActionShot);
            public static string Testimonial = nameof(Testimonial);
        }
    }

}