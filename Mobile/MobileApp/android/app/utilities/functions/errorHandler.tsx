export const errorHandler = (
    fileName: string,
    functionname: string,
    err: Error,
) => {
    try{
        console.log('Error at =>',{
            fileName,
            functionname,
            message: err?.message,
        });
        return err?.message || JSON.stringify(err);
    } catch(error:any){
        const e = error as Error;
        console.log('errorHandler => ', e?.message);
        return null;
    }
};